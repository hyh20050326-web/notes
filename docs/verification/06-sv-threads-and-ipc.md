# 06. 线程并发与线程间通信 (IPC)

在测试平台中，各个组件（Driver、Monitor、Scoreboard、看门狗定时器）在物理上是**独立且并行运行**的。SystemVerilog 提供了强大的多线程并发控制语句（`fork...join` 系列）与进程间通信（Inter-Process Communication, IPC）机制（`event`、`semaphore`、`mailbox`）。

---

## 1. 线程创建与并发控制：Fork...Join 家族

SystemVerilog 通过 `fork...join` 块派生并发线程，包含三种经典的汇合语义：

<div class="arch-tree">
  <div class="arch-root">
    <div class="arch-badge">并发语义对比</div>
    <div class="arch-title">Fork...Join 家族三大汇合模式</div>
  </div>
  <div class="arch-branches">
    <div class="arch-card">
      <div class="arch-card-header">🔒 fork ... join (全汇合)</div>
      <div class="arch-card-body">
        <ul>
          <li><strong>父线程阻塞等待</strong>：必须等待块内<strong>所有</strong>子线程全部执行完毕</li>
          <li><strong>适用场景</strong>：多通道并发发送激励，必须全部传输完成才允许进入下一阶段</li>
        </ul>
      </div>
    </div>
    <div class="arch-card">
      <div class="arch-card-header">⏱️ fork ... join_any (任意汇合)</div>
      <div class="arch-card-body">
        <ul>
          <li><strong>谁快谁放行</strong>：块内只要有<strong>任意一个</strong>子线程结束，父线程立即恢复执行</li>
          <li><strong>适用场景</strong>：<strong>看门狗超时监控</strong>（业务线程 vs 超时定时器比谁先结束）</li>
        </ul>
      </div>
    </div>
    <div class="arch-card">
      <div class="arch-card-header">⚡ fork ... join_none (立即放行)</div>
      <div class="arch-card-body">
        <ul>
          <li><strong>零时间放行</strong>：父线程完全不等待，所有子线程作为后台独立进程持续并发运行</li>
          <li><strong>适用场景</strong>：Driver/Monitor 启动常驻死循环后台监听总线</li>
        </ul>
      </div>
    </div>
  </div>
</div>

| 语句类型 | 父线程恢复执行条件 | 典型工程应用场景 |
| :--- | :--- | :--- |
| **`fork ... join`** | 块内**所有**派生线程全部执行完毕 | 多通道同时发送数据，必须全部发送完毕才进入下一测试阶段 |
| **`fork ... join_any`** | 块内**只要有任意一个**线程执行完毕即刻恢复 | **看门狗（Watchdog）超时检测机制**（任务执行 vs 超时定时器比谁先到） |
| **`fork ... join_none`** | **立即恢复**，所有子线程作为后台并发进程持续运行 | Driver/Monitor 在环境初始化阶段启动无限循环监听线程 |

### 1.1 看门狗超时检测经典代码模版 (`join_any`)
```system-verilog
task wait_for_interrupt_with_timeout(int timeout_ns);
    fork
        begin
            // 线程 1：等待硬件中断拉高
            @(posedge vif.intr);
            $display("[SUCCESS] Interrupt received at %0t", $time);
        end
        begin
            // 线程 2：超时看门狗定时器
            #timeout_ns;
            $error("[TIMEOUT] Interrupt timed out after %0dns!", timeout_ns);
        end
    join_any // 谁先发生就先放行
    
    // 关键：杀死尚未完成的另一个线程（防止幽灵定时器在后台继续报错）
    disable fork; 
endtask
```

### 1.2 动态线程变量陷阱（面试必考题）
观察以下循环启动 4 个线程的代码：

```system-verilog
// ❌ 错误写法：所有线程共享同一个全局 i
for (int i = 0; i < 4; i++) begin
    fork
        $display("Thread ID = %0d", i);
    join_none
end
```
- **输出异常**：很可能会连续打印 4 次 `Thread ID = 4`！  
  **本质机理**：`join_none` 不会立即执行子线程，循环在 0 仿真时间内迅速结束，此时变量 `i` 已经累加到 4；等到调度器切入子线程时，它们读取的都是同一个静态地址的 `i`。
- ** 标准写法：使用循环内局部自动变量打隔离快照**
```system-verilog
for (int i = 0; i < 4; i++) begin
    automatic int j = i; // 每次循环都在栈上创建独立的局部变量 j
    fork
        $display("Thread ID = %0d", j); // 正确输出 0, 1, 2, 3
    join_none
end
```

---

## 2. 线程控制：`disable fork` 与 `wait fork`

- **`disable fork;`**：终止当前进程所派生的**所有活跃子线程**（如上述超时看门狗处理）。
- **`wait fork;`**：阻塞当前线程，直到当前进程派生的**所有后台后台子线程执行完毕**才继续。

---

## 3. 进程间通信 (IPC) 三剑客对比

在并发环境下，不同线程之间需要安全地传递状态、申请排他资源以及输送数据包。

<div class="arch-tree">
  <div class="arch-root">
    <div class="arch-badge">进程通信基石</div>
    <div class="arch-title">SystemVerilog IPC 三剑客对比矩阵</div>
  </div>
  <div class="arch-branches">
    <div class="arch-card">
      <div class="arch-card-header">⚡ 事件 (Event)</div>
      <div class="arch-card-body">
        <ul>
          <li><strong>单比特瞬态脉冲</strong>：不携带数据实体</li>
          <li>触发：<code>-&gt; e</code>；等待：推荐 <code>wait(e.triggered)</code></li>
          <li><strong>核心作用</strong>：线程间状态就绪、复位完成单向同步</li>
        </ul>
      </div>
    </div>
    <div class="arch-card">
      <div class="arch-card-header">🔑 旗语 (Semaphore)</div>
      <div class="arch-card-body">
        <ul>
          <li><strong>共享资源互斥锁</strong>：钥匙发放与排队获取</li>
          <li>方法：<code>get(N)</code>（阻塞）、<code>put(N)</code>（归还钥匙）</li>
          <li><strong>核心作用</strong>：多个 Agent 争夺同一个物理总线时排他防抢占</li>
        </ul>
      </div>
    </div>
    <div class="arch-card">
      <div class="arch-card-header">📫 信箱 (Mailbox)</div>
      <div class="arch-card-body">
        <ul>
          <li><strong>先进先出数据缓存通道</strong>：自带阻塞握手</li>
          <li>方法：<code>put() / get()</code>（阻塞）、<code>try_put / try_get</code></li>
          <li><strong>核心作用</strong>：Generator 与 Driver 之间的生产者-消费者模型</li>
        </ul>
      </div>
    </div>
  </div>
</div>

### 3.1 事件 (Event)：同步状态指示
事件是轻量级的无数据同步标志，有两个关键语法：
- 触发：`-> e;`（立即触发）或 `->> e;`（非阻塞在 NBA 区域触发）。
- 等待：`@(e);`（边沿敏感）与 `wait(e.triggered);`（电平稳态敏感）。

::: danger 竞争陷阱：@(e) 信号丢失
如果触发事件 `-> e` 与等待事件 `@(e)` 发生在**同一个仿真时刻的相同 delta cycle**，且触发在先、等待在后，`@(e)` 将错过边沿跳变而**永久死锁**！  
**黄金准则**：在 SystemVerilog 中推荐使用 `wait(e.triggered);`，它在当前时间步内始终保持有效状态，避免由于时序调度次序导致的事件丢失。
:::

### 3.2 旗语 (Semaphore)：互斥资源访问锁
当多个 Agent 或线程试图同时访问同一个物理接口（例如双核 CPU 争夺单一 APB 总线）时，必须通过旗语进行互斥：

```system-verilog
semaphore key_bus = new(1); // 初始化 1 把互斥钥匙

task send_bus(Transaction tr);
    // 阻塞获取 1 把钥匙，拿不到则排队挂起
    key_bus.get(1); 
    
    // 成功获取临界区访问权限
    vif.drive_packet(tr);
    
    // 操作完成，归还钥匙
    key_bus.put(1);
endtask
```
- `get(N)`：获取 $N$ 个钥匙（若钥匙不够则阻塞休眠）。
- `try_get(N)`：非阻塞获取，成功返回 1，若钥匙不足直接返回 0 不等待。
- `put(N)`：归还 $N$ 个钥匙。

### 3.3 信箱 (Mailbox)：解耦的数据搬运通道
信箱是 Generator（生产者）与 Driver（消费者）之间最标准的通信方式：

```system-verilog
// 强烈推荐使用参数化信箱，提供强类型安全保护！
mailbox #(Transaction) mbx = new(10); // 容量为 10 的有界信箱

// 生产者线程 (Generator)
task generator();
    Transaction tr;
    forever begin
        tr = new();
        assert(tr.randomize());
        mbx.put(tr); // 若信箱已满 (10 个)，自动阻塞等待消费者消耗
    end
endtask

// 消费者线程 (Driver)
task driver();
    Transaction tr;
    forever begin
        mbx.get(tr); // 若信箱为空，自动阻塞等待数据放入
        vif.drive(tr);
    end
endtask
```

| 方法 | 阻塞性 | 描述 |
| :--- | :--- | :--- |
| `put(obj)` | **阻塞** | 放入对象；若信箱满则挂起等待 |
| `try_put(obj)` | 非阻塞 | 尝试放入对象；成功返回 1，信箱满则返回 0 且不阻塞 |
| `get(obj)` | **阻塞** | 取出对象并从信箱中移除；若信箱空则挂起等待 |
| `try_get(obj)` | 非阻塞 | 尝试取出对象；成功返回 1，信箱空则返回 0 |
| `peek(obj)` | **阻塞** | **仅拷贝查看**信箱头部数据，**不从信箱中移除** |
| `num()` | 非阻塞 | 返回当前信箱内部累积的消息对象个数 |

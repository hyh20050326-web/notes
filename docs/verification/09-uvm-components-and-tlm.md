# 09. UVM 核心组件、TLM 事务通信与 Factory 重载

UVM 平台的高可重用性源自其**标准化的核心组件分工**、**解耦的事务级通信（TLM）机制**以及**无侵入的 Factory 工厂重载能力**。本章深度拆解各组件的标准代码模板与交互时序。

---

## 1. 激励三剑客的握手舞蹈：Sequence $\leftrightarrow$ Sequencer $\leftrightarrow$ Driver

在 UVM 中，激励生成与硬件时序驱动被彻底解耦：

<div class="flow-steps">
  <div class="flow-step-box">1. <code>driver</code> 发起索取<br><small style="color:var(--vp-c-text-2);"><code>get_next_item(req)</code></small></div>
  <span class="flow-arrow">➔</span>
  <div class="flow-step-box">2. <code>sequence</code> 准备并随机化<br><small style="color:var(--vp-c-text-2);"><code>start_item() &amp;&amp; randomize()</code></small></div>
  <span class="flow-arrow">➔</span>
  <div class="flow-step-box">3. <code>finish_item()</code> 注入管道<br><small style="color:var(--vp-c-text-2);">传递给 <code>driver</code></small></div>
  <span class="flow-arrow">➔</span>
  <div class="flow-step-box" style="border-color:var(--vp-c-brand-1);">4. <code>driver</code> 驱动物理波形<br><small style="color:var(--vp-c-brand-1);">纳秒级时序驱动 DUT 引脚跳变</small></div>
  <span class="flow-arrow">➔</span>
  <div class="flow-step-box">5. <code>driver</code> 确认完成<br><small style="color:var(--vp-c-text-2);"><code>item_done()</code> 解除握手闭环</small></div>
</div>

### 1.1 事务定义：`uvm_sequence_item`
```system-verilog
class my_transaction extends uvm_sequence_item;
    rand bit [31:0] addr;
    rand bit [31:0] data;
    rand bit        is_write;

    // 注册到 UVM Factory 工厂
    `uvm_object_utils_begin(my_transaction)
        `uvm_field_int(addr, UVM_ALL_ON)
        `uvm_field_int(data, UVM_ALL_ON)
        `uvm_field_int(is_write, UVM_ALL_ON)
    `uvm_object_utils_end

    function new(string name = "my_transaction");
        super.new(name);
    endfunction
    
    constraint c_align { addr[1:0] == 2'b00; } // 4 字节对齐
endclass
```

### 1.2 驱动器实现：`uvm_driver`
```system-verilog
class my_driver extends uvm_driver #(my_transaction);
    `uvm_component_utils(my_driver)

    virtual bus_if vif;

    function new(string name, uvm_component parent);
        super.new(name, parent);
    endfunction

    function void build_phase(uvm_phase phase);
        super.build_phase(phase);
        // 从 config_db 中获取顶层传入的虚接口 vif
        if (!uvm_config_db#(virtual bus_if)::get(this, "", "vif", vif))
            `uvm_fatal("DRV", "Virtual interface vif not found in config_db!")
    endfunction

    task run_phase(uvm_phase phase);
        forever begin
            // 1. 阻塞等待 Sequencer 传递 item
            seq_item_port.get_next_item(req);
            
            // 2. 驱动到物理总线 (消耗仿真时间)
            drive_transfer(req);
            
            // 3. 必须调用 item_done() 告诉 sequence 当前 item 已完成！
            seq_item_port.item_done();
        end
    endtask

    task drive_transfer(my_transaction tr);
        @(vif.drv_cb);
        vif.drv_cb.addr  <= tr.addr;
        vif.drv_cb.data  <= tr.data;
        vif.drv_cb.write <= tr.is_write;
        @(vif.drv_cb);
        // 等待 ready 信号...
    endtask
endclass
```

---

## 2. Agent 的包装哲学：Active vs Passive

`uvm_agent` 是一个标准协议验证单元的集合包装体：

<div class="compare-grid">
  <div class="compare-col highlight">
    <div class="compare-col-title">⚡ UVM_ACTIVE (主动模式)</div>
    <ul>
      <li><strong>包含组件</strong>：Sequencer + Driver + Monitor</li>
      <li><strong>职能定位</strong>：既产生激励时序主动驱动 DUT，又在总线上监听采样</li>
      <li><strong>典型场景</strong>：DUT 的输入总线端口（如 CPU 主控口、数据包接收通道）</li>
    </ul>
  </div>
  <div class="compare-col">
    <div class="compare-col-title">👂 UVM_PASSIVE (被动模式)</div>
    <ul>
      <li><strong>包含组件</strong>：仅例化 Monitor（不创建 Sequencer 和 Driver）</li>
      <li><strong>职能定位</strong>：静默无损侦听总线跳变，不向外驱动任何高低电平</li>
      <li><strong>典型场景</strong>：DUT 的输出监测端、多主总线上的外部第三方节点</li>
    </ul>
  </div>
</div>

- **UVM_ACTIVE（主动模式）**：包含 Sequencer、Driver、Monitor。用于 DUT 的**输入端**，既驱动激励又监听引脚。
- **UVM_PASSIVE（被动模式）**：只例化 Monitor，不创建 Sequencer 和 Driver。用于 DUT 的**输出端**（如只读监听网络包输出），或者用于多核总线上其他只听不说的节点。

---

## 3. TLM 1.0 通信机制与一对多广播 (Analysis Port)

在验证环境中，组件之间的信息传递严禁直接调用彼此的内部变量，必须通过 **TLM（Transaction Level Modeling，事务级建模）** 接口解耦。

### 3.1 Port、Export 与 Imp 黄金三角法则

<div class="flow-steps">
  <div class="flow-step-box">1. 发起端 (Port)<br><small style="color:var(--vp-c-text-2);">主动调用 <code>port.put()</code></small></div>
  <span class="flow-arrow">➔</span>
  <div class="flow-step-box">2. 中间转发端 (Export)<br><small style="color:var(--vp-c-text-2);">中间层组件向上暴露能力</small></div>
  <span class="flow-arrow">➔</span>
  <div class="flow-step-box" style="border-color:var(--vp-c-brand-1); background:var(--vp-c-brand-soft);">🎯 3. 终点实现端 (Imp)<br><small style="color:var(--vp-c-brand-1);">真正编写 <code>task put()</code> 实体代码的归宿</small></div>
</div>
- **Port（端口）**：主动发起动作的一端（例如“我需要发送数据，调用 `port.put()`”）。
- **Export（导出端）**：中间过渡层，将下层子组件的能力向外暴露。
- **Imp（实现端）**：**最终落脚点**。Imp 所在的类**必须真正编写对应的实现函数**（例如实现 `function void write()` 或 `task put()`）。

### 3.2 Analysis Port 的广播魅力
普通 Port 是一对一的，但在实际验证中，Monitor 采到一个数据包后，**通常需要同时抄送给 Scoreboard（进行比对）、Coverage（收集覆盖率）和 Logger（落盘记录）**。

UVM 提供了专用于一对多非阻塞广播的 `uvm_analysis_port`：

```system-verilog
// 1. Monitor 声明并广播数据
class my_monitor extends uvm_monitor;
    uvm_analysis_port #(my_transaction) ap; // 声明广播端口

    function void build_phase(uvm_phase phase);
        ap = new("ap", this);
    endfunction

    task run_phase(uvm_phase phase);
        forever begin
            vif.collect_packet(tr);
            ap.write(tr); // 广播发送给所有订阅者，不消耗仿真时间
        end
    endtask
endclass

// 2. Scoreboard 接收并实现 write 函数
class my_scoreboard extends uvm_scoreboard;
    `uvm_analysis_imp_decl(_mon) // 宏声明专有 imp 后缀
    uvm_analysis_imp_mon #(my_transaction, my_scoreboard) mon_imp;

    function void build_phase(uvm_phase phase);
        mon_imp = new("mon_imp", this);
    endfunction

    // 必须实现 write_mon 函数
    function void write_mon(my_transaction tr);
        $display("[Scoreboard] Received packet with addr = 0x%08X", tr.addr);
        // 放入内部队列，与黄金模型输出比对...
    endfunction
endclass
```

---

## 4. Factory 工厂机制与动态重载 (Override)

Factory 机制是 UVM 最核心的扩展利器。**它允许验证工程师在不改动顶层环境和底层 Driver 源码的情况下，一键将基础数据包替换为派生的注错坏包。**

### 4.1 注册与实例化的工程铁律
- **注册**：类声明内部必须使用宏注册：
  - `uvm_object` 使用 `` `uvm_object_utils(class_name) ``
  - `uvm_component` 使用 `` `uvm_component_utils(class_name) ``
- **实例化**：**绝对严禁用 `new()` 实例化组件和事务！** 必须使用工厂创建方法：
  ```system-verilog
  //  标准工厂实例化
  drv = my_driver::type_id::create("drv", this);
  tr  = my_transaction::type_id::create("tr");
  ```

### 4.2 动态重载实战：`type_override`
当我们需要测试 CRC 错误场景时，派生一个新事务类：

```system-verilog
class bad_transaction extends my_transaction;
    `uvm_object_utils(bad_transaction)
    constraint c_bad_crc { crc_err == 1'b1; }
endclass

// 在特定测试用例 test_crc_err 的 build_phase 中注入重载
class test_crc_err extends uvm_test;
    // ...
    function void build_phase(uvm_phase phase);
        super.build_phase(phase);
        // 全局重载：凡是代码中请求创建 my_transaction 的地方，工厂全部换成 bad_transaction！
        set_type_override_by_type(my_transaction::get_type(), bad_transaction::get_type());
    endfunction
endclass
```

---

## 5. UVM Config DB 参数传递规范

`uvm_config_db` 是全局配置数据库，用于跨越层级传递变量（尤其是 `virtual interface`）：

```system-verilog
// 1. 在顶层 top_tb 中设置 (Set)
initial begin
    // 参数含义: context (通常为 null), 目标组件路径, 索引键名, 传入的实参
    uvm_config_db#(virtual bus_if)::set(null, "uvm_test_top.env.agt.*", "vif", physical_if);
    run_test("my_test");
end

// 2. 在底层 Driver 中获取 (Get)
function void my_driver::build_phase(uvm_phase phase);
    super.build_phase(phase);
    // 从当前节点上下文查找 "vif"
    if (!uvm_config_db#(virtual bus_if)::get(this, "", "vif", vif)) begin
        `uvm_fatal("CONFIG_FAIL", "Cannot get vif from config_db!")
    end
endfunction
```
::: tip 安全检查建议
`uvm_config_db::get` 总是返回一个 `bit` 标志指示是否匹配成功。在获取配置或接口时，必须包裹在 `if (!get(...))` 中进行校验，防止由于键名拼写错误导致静默赋 null 引发致命的仿真奔溃。
:::

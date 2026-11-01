# 08. UVM 体系总览与 Phase 运行机制

**UVM（Universal Verification Methodology，通用验证方法学）** 是由各大 EDA 巨头（Synopsys, Cadence, Mentor）与 Accellera 联合推出的行业标准验证框架。它将面向对象的设计模式与芯片验证最佳实践高度工程化，是目前数字集成电路验证领域的绝对行业事实标准。

---

## 1. 验证方法学的演进历史

在 UVM 之前，各大 EDA 厂商各自为战：
- Synopsys 推广 **VMM (Verification Methodology Manual)**；
- Mentor 推出 **AVM**，后与 Cadence 联合演进出 **OVM (Open Verification Methodology)**。

<div class="flow-steps">
  <div class="flow-step-box">Synopsys VMM (早期方法学)</div>
  <span class="flow-arrow">+</span>
  <div class="flow-step-box">Cadence / Mentor OVM (基座演进)</div>
  <span class="flow-arrow">➔</span>
  <div class="flow-step-box" style="border-color:var(--vp-c-brand-1); background:var(--vp-c-brand-soft);">🏛️ Accellera UVM (行业事实统一标准)</div>
  <span class="flow-arrow">➔</span>
  <div class="flow-step-box">📜 IEEE 1800.2 国际通用验证标准</div>
</div>
- **核心价值**：统一了验证平台术语、组件接口规范与代码结构，使验证 IP（VIP）能够在不同公司的芯片项目和不同的 EDA 仿真器间无缝复用。

---

## 2. UVM 类体系的核心分野：Component vs Object

在 UVM 类继承树中，所有的类最终都派生自 `uvm_void`。但最关键的分野发生在 `uvm_object` 之下：

<div class="arch-tree">
  <div class="arch-root">
    <div class="arch-badge">面向对象类继承树</div>
    <div class="arch-title">UVM 核心基类家族谱系</div>
  </div>
  <div class="arch-branches">
    <div class="arch-card">
      <div class="arch-card-header">📦 uvm_object (瞬态数据载体)</div>
      <div class="arch-card-body">
        <p><strong>构造函数</strong>：<code>new(string name = "my_obj")</code></p>
        <ul>
          <li><strong>uvm_sequence_item</strong>：抽象事务包 (Transaction)</li>
          <li><strong>uvm_sequence</strong>：激励序列产生逻辑</li>
          <li><strong>uvm_configuration</strong>：环境动态配置项</li>
          <li><strong>生命周期</strong>：短命，流转比对后由 GC 垃圾回收</li>
        </ul>
      </div>
    </div>
    <div class="arch-card highlight" style="border-color:var(--vp-c-brand-1);">
      <div class="arch-card-header">🏛️ uvm_component (静态拓扑组件)</div>
      <div class="arch-card-body">
        <p><strong>构造函数</strong>：<code>new(string name, uvm_component parent)</code></p>
        <ul>
          <li><strong>Driver / Monitor</strong>：底层引脚协议驱动与无损监听</li>
          <li><strong>Sequencer</strong>：事务流通道路由与仲裁</li>
          <li><strong>Agent / Scoreboard / Env / Test</strong>：环境装配金字塔</li>
          <li><strong>生命周期</strong>：长生不老，全生命周期贯穿 9 大 Phase</li>
        </ul>
      </div>
    </div>
  </div>
</div>

### 两种基类的本质区别（面试高频考点）

| 对比维度 | `uvm_component` (组件类) | `uvm_object` (事务/数据类) |
| :--- | :--- | :--- |
| **物理角色** | 构成验证平台骨架的“设备工人”（如 Driver, Monitor） | 在工人之间流转传递的“物料包裹”（如 Transaction） |
| **生命周期** | **长生不老**：从仿真开始一直存活到仿真结束 | **转瞬即逝**：创建、发送、比较后即被垃圾回收 |
| **层级关系** | 拥有严格的树状父子拓扑路径（如 `uvm_test_top.env.agt.drv`） | 孤立存在，无父子层级关系 |
| **构造函数形参** | **必须接收 2 个参数**：`new(string name, uvm_component parent)` | **仅需 1 个参数**：`new(string name = "my_object")` |
| **Phase 机制** | **原生支持 Phase 运行机制**（如 build_phase, run_phase） | **不支持 Phase 机制** |

---

## 3. UVM 经典树状层级拓扑

一个标准的 UVM 验证平台在内存中组织为一棵整洁的树状组件树：

<div class="arch-tree">
  <div class="arch-root">
    <div class="arch-badge">树状结构</div>
    <div class="arch-title">标准 UVM 平台树状拓扑组件拓扑</div>
  </div>
  <div class="arch-branches">
    <div class="arch-card">
      <div class="arch-card-header">1. 顶层根节点</div>
      <div class="arch-card-body">
        <ul>
          <li><code>uvm_root</code> (全局单例 <code>uvm_top</code>)</li>
          <li>挂载具体的 <code>uvm_test</code> (测试用例入口)</li>
          <li>再向下实例化并管理 <code>uvm_env</code> (验证顶层环境)</li>
        </ul>
      </div>
    </div>
    <div class="arch-card">
      <div class="arch-card-header">2. 输入侧 Agent (Active)</div>
      <div class="arch-card-body">
        <ul>
          <li><code>uvm_sequencer</code>：事务缓冲调度</li>
          <li><code>uvm_driver</code>：将 item 翻译为引脚时序驱动 DUT</li>
          <li><code>uvm_monitor</code>：采样输入事务发给参考模型</li>
        </ul>
      </div>
    </div>
    <div class="arch-card">
      <div class="arch-card-header">3. 输出侧 Agent (Passive)</div>
      <div class="arch-card-body">
        <ul>
          <li>仅包含 <code>uvm_monitor</code></li>
          <li>无损捕获 DUT 硬件实际输出数据包</li>
          <li>通过 TLM 端口广播给 Scoreboard 准备比对</li>
        </ul>
      </div>
    </div>
    <div class="arch-card">
      <div class="arch-card-header">4. 检查与黄金模型</div>
      <div class="arch-card-body">
        <ul>
          <li><code>reference_model</code>：软件黄金模型计算期望值</li>
          <li><code>uvm_scoreboard</code>：逐字段比对期望值与实际值</li>
        </ul>
      </div>
    </div>
  </div>
</div>

---

## 4. UVM Phase 机制深度解析

为了协调全平台几十上百个组件的初始化、连线、启动与销毁顺序，UVM 引入了全局 Phase 机制。

<div class="flow-steps">
  <div class="flow-step-box">1. build_phase<br><small style="color:var(--vp-c-text-2);">Top-down 实例化子组件与配置</small></div>
  <span class="flow-arrow">➔</span>
  <div class="flow-step-box">2. connect_phase<br><small style="color:var(--vp-c-text-2);">Bottom-up TLM端口连接</small></div>
  <span class="flow-arrow">➔</span>
  <div class="flow-step-box">3. elaboration & start_sim<br><small style="color:var(--vp-c-text-2);">拓扑检查与就绪</small></div>
  <span class="flow-arrow">➔</span>
  <div class="flow-step-box" style="border-color:var(--vp-c-brand-1); background:var(--vp-c-brand-soft);">⚡ 4. run_phase (Task)<br><small style="color:var(--vp-c-brand-1);">消耗时间、多组件并发运转</small></div>
  <span class="flow-arrow">➔</span>
  <div class="flow-step-box">5. extract & check<br><small style="color:var(--vp-c-text-2);">收集覆盖率与残余未比对检查</small></div>
  <span class="flow-arrow">➔</span>
  <div class="flow-step-box">6. report & final<br><small style="color:var(--vp-c-text-2);">打印 PASS/FAIL 总结报告</small></div>
</div>

### 4.1 自顶向下 vs 自底向上的执行顺序（经典考题）
- **`build_phase`（自顶向下 Top-down）**：
  - 必须由父节点先实例化，子节点才能挂载到父节点之下；同时父节点可以在自身 `build_phase` 中利用 `uvm_config_db` 下发配置，子节点在其 `build_phase` 才能及时接收到该配置。
- **`connect_phase`（自底向上 Bottom-up）**：
  - 子组件首先完成自身内部子模块的端口连线，然后向上一级暴露总端口，供父组件进行更大维度的跨组件互联。

### 4.2 Function Phase vs Task Phase
- **Function Phase**（除 run_phase 外的所有 phase）：属于 `function void`，在**零仿真时间**内执行完毕，禁止包含 `@(posedge clk)` 或 `#100` 等耗时语句。
- **Task Phase**（`run_phase` 以及 12 个细分 run-time sub-phases）：属于 `task`，在仿真器时间轴上持续运转，驱动总线时序与采样。

---

## 5. Objection 仿真生命周期控制

在传统 Verilog 中，测试何时结束通常靠在 initial 块里拍脑袋写 `#100000 $finish;`。如果数据传输慢了就会提前猝死，如果数据早发完了又空跑浪费仿真机算力。

UVM 引入了优雅的 **Objection（异议/投票）机制**：

<div class="flow-steps">
  <div class="flow-step-box">1. <code>run_phase</code> 启动</div>
  <span class="flow-arrow">➔</span>
  <div class="flow-step-box" style="border-color:var(--vp-c-brand-1);">2. <code>phase.raise_objection(this);</code><br><small style="color:var(--vp-c-brand-1);">持有异议：环境事务开始运行，严禁提前退出！</small></div>
  <span class="flow-arrow">➔</span>
  <div class="flow-step-box">3. 连续发送 Sequence 事务激励并等待比对完成...</div>
  <span class="flow-arrow">➔</span>
  <div class="flow-step-box">4. <code>phase.drop_objection(this);</code><br><small style="color:var(--vp-c-text-2);">撤销异议：事务处理完毕</small></div>
  <span class="flow-arrow">➔</span>
  <div class="flow-step-box">5. 全局异议计数归零（+Drain Time）➔ 退出 <code>run_phase</code> 进入报告阶段</div>
</div>

### 规范使用守则
1. **原则上由最顶层的 Sequence 或 Test 控制 Objection**，Driver 和 Monitor 等被动底层组件不应滥用 `raise_objection`，否则极易导致仿真永远无法退出（Hang 悬挂）。
2. **设置 Drain Time**：当最后一个事务发送完毕后，DUT 内部流水线可能还需要几个时钟周期的延迟才能将最后一批数据冲刷出来。可以在 Test 顶层设置清空时间：
```system-verilog
phase.phase_done.set_drain_time(this, 100ns);
```
此时 `drop_objection` 发生后，UVM 引擎会额外再等待 100ns 确认没有新的异议提出，才会真正终结 `run_phase`。

# 数字 IC 验证（SystemVerilog & UVM）体系指南

本专栏紧密围绕数字集成电路（Digital IC）验证工程师核心技能树构建，融合经典教材 **《SystemVerilog验证 测试平台编写指南》（Chris Spear / 绿皮书）** 与优质工程网课 **“十代目言纲·数字IC验证学习系列”** 的实战精华，旨在搭建从底层 SV 语法机制到顶层 UVM 工业级验证平台的完整知识闭环。

---

## 📌 知识图谱与学习路线

<div class="arch-tree">
  <div class="arch-root">
    <div class="arch-badge">全流程导航</div>
    <div class="arch-title">数字 IC 验证三阶段学习路线图</div>
  </div>
  <div class="arch-branches">
    <div class="arch-card">
      <div class="arch-card-header">🌱 阶段一：SystemVerilog 语言核心 (绿皮书)</div>
      <div class="arch-card-body">
        <ul>
          <li><strong>01. 验证导论与分层思想</strong>：HVL 核心演进、Layered Testbench 架构</li>
          <li><strong>02. 数据类型与动态容器</strong>：2态/4态、动态数组、队列、关联数组</li>
          <li><strong>03. 接口与时钟块</strong>：Interface、Clocking Block、Virtual Interface 桥梁</li>
          <li><strong>04. 面向对象 OOP</strong>：类与句柄、虚方法多态、深浅拷贝、Blueprint 模式</li>
          <li><strong>05. 约束随机化 (CRV)</strong>：rand/randc、solve...before 概率引导、软约束 soft</li>
          <li><strong>06. 线程并发与 IPC 通信</strong>：fork...join 家族、Event 稳态等待、Mailbox</li>
          <li><strong>07. 功能覆盖率 Coverage</strong>：covergroup、仓 bins 划分、交叉覆盖率 cross</li>
        </ul>
      </div>
    </div>
    <div class="arch-card">
      <div class="arch-card-header">🚀 阶段二：UVM 工业级验证方法学</div>
      <div class="arch-card-body">
        <ul>
          <li><strong>08. UVM 体系与 Phase 机制</strong>：uvm_component vs object、9大 Phase 同步流转、Objection 异议控制</li>
          <li><strong>09. 核心组件与 TLM 通信</strong>：Driver / Monitor / Scoreboard、TLM Port/Export/Imp、Factory 工厂动态重载</li>
          <li><strong>Sequence 激励机制</strong>：Item 随机化、Sequencer 仲裁通道、Driver 协议握手</li>
        </ul>
      </div>
    </div>
    <div class="arch-card">
      <div class="arch-card-header">🏆 阶段三：芯片级综合工程实战</div>
      <div class="arch-card-body">
        <ul>
          <li><strong>10. MCDF 多通道格式化器验证</strong>：DUT 规格时序分解、Makefile + VCS + Verdi 工具流</li>
          <li><strong>端到端平台闭环</strong>：Channel/Reg/Formatter Agent、C/SV 行为参考模型、覆盖率收敛与 STAR 答辩</li>
        </ul>
      </div>
    </div>
  </div>
</div>

---

## 📚 教程与教材索引映射表

| 章节名称 | 核心主题 | 绿皮书对应章节 | 网课视频分集映射 (十代目言纲) |
| :--- | :--- | :--- | :--- |
| **[01. 验证导论与分层测试平台](./01-sv-intro-and-methodology.md)** | HVL vs HDL、验证流程、分层架构、简历技能提炼 | 第 1 章（验证导论） | `P1` SV第一章及简历补充 |
| **[02. 数据类型与内存管理](./02-sv-data-types.md)** | 2态/4态数据类型、动态数组/队列/关联数组、方法内置函数 | 第 2 章（数据类型） | `P2` SV第二章数据类型 |
| **[03. 接口、时钟块与虚接口](./03-sv-interface-and-clocking.md)** | `interface` 封装、`clocking block` 消除时序竞争、`virtual interface` 桥接 | 第 4、10 章（连接设计与测试平台） | 视频穿插 / 绿皮书重点 |
| **[04. 面向对象编程 (OOP) 核心指南](./04-sv-oop-principles.md)** | 类与句柄、封装/继承/多态、虚方法、深浅拷贝、Blueprint 模式 | 第 3、5、8 章（OOP 基础与高级技巧） | `P3` SV第三/五/八章 面向对象编程 |
| **[05. 受约束的随机激励 (CRV) 实战](./05-sv-randomization.md)** | `rand/randc`、`inside/dist` 约束、`solve...before` 概率引导、随机冲突排查 | 第 6 章（随机化） | 验证核心 / 绿皮书重点 |
| **[06. 线程并发与线程间通信 (IPC)](./06-sv-threads-and-ipc.md)** | `fork...join/any/none`、动态线程变量陷阱、Event / Semaphore / Mailbox | 第 7 章（线程及线程间通信） | 验证核心 / 绿皮书重点 |
| **[07. 功能覆盖率深度解析](./07-sv-coverage.md)** | 代码/功能/断言覆盖率闭环、`covergroup`、仓 `bins` 分类、交叉覆盖率 `cross` | 第 9 章（功能覆盖率） | `P4` SV第九章 覆盖率（上） |
| **[08. UVM 体系总览与 Phase 机制](./08-uvm-overview-and-architecture.md)** | 方法学演进、`uvm_component` 与 `uvm_object`、Phase 拓扑执行、Objection 机制 | UVM 实战导读 | `P5` UVM 概述与第一章、`P6` 简易平台 |
| **[09. UVM 核心组件与 TLM 通信](./09-uvm-components-and-tlm.md)** | Driver/Monitor/Scoreboard 协作、TLM 1.0 Port/Export/Imp、Factory 重载 | UVM 架构进阶 | `P6/P7/P9/P10/P14` 第二章简易平台系列 |
| **[10. MCDF 芯片验证平台实战全流程](./10-uvm-mcdf-case-study.md)** | MCDF DUT 规格、协议时序、Agent 封装、黄金参考模型、断言与回归测试 | 工业级项目落地 | `P8` 跑仿真、`P11` MCDF功能时序、`P12/P13` 组件与驱动实战 |

---

## 🎯 验证工程师核心求职简历亮点与面试要求

在当前半导体行业中，数字验证岗位对于候选人的考查重点主要分为三层：

1. **语言底层功底（SystemVerilog）**：
   - 彻底搞懂四态值（`X/Z/0/1`）与二态值（`0/1`）转换隐患、动态内存（动态数组/队列/关联数组）开销与生命周期。
   - 掌握面向对象思想（句柄传递与实体指针、虚方法与多态调用、深浅拷贝底层细节）。
   - 深入理解 SV 事件调度队列（Stratified Event Queue：Active, Observed, Reactive, Postponed），熟练使用 `clocking block` 规避仿真毛刺与竞争冒险。
   - 掌握受约束随机（CRV）的解空间分布与概率引导技巧。

2. **验证方法学（UVM 规范）**：
   - 熟练运用 Factory 工厂机制（`type_override` 与 `inst_override`）实现免改代码的测试用例替换。
   - 掌握 TLM 1.0 接口规范（Port / Export / Imp 与 analysis_port 一对多广播）。
   - 熟练掌控 9 大公共 Phase 与 12 个 Task 动态 Phase 执行时序，精准控制 `raise_objection` / `drop_objection` 避免仿真悬挂。
   - 熟练构建 Sequence-Sequencer-Driver 三级激励传输通道与虚拟序列器（Virtual Sequencer）跨接口协调。

3. **项目与工程交付能力**：
   - 能够独立阅读芯片设计规格书（Spec），提炼验证功能点，制定验证计划（Verification Plan）。
   - 具备独立搭建端到端验证环境能力（总线 Agent、参考模型 Reference Model、自动比对计分板 Scoreboard）。
   - 掌握使用 EDA 工具（如 Synopsys VCS / Verdi，Cadence Xcelium 等）提取代码覆盖率（Line, Branch, Cond, Toggle, FSM）并编写 covergroup 闭环功能覆盖率。

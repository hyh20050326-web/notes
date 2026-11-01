# 10. 综合实战：MCDF 芯片验证平台全流程

**MCDF（Multi-Channel Data Formatter，多通道数据格式化器）** 是半导体业界与高校在数字验证培训中最经典的实战 DUT。它集成了寄存器配置总线、多路突发数据流、FIFO 缓冲、优先级仲裁与打包格式化输出，涵盖了真实 SoC 子系统验证所需面对的核心场景。

---

## 1. MCDF 设计规格与硬件架构 (DUT Specification)

<div class="arch-tree">
  <div class="arch-root">
    <div class="arch-badge">硬件设计规格</div>
    <div class="arch-title">MCDF (多通道数据格式化器) 核心内部架构拓扑</div>
  </div>
  <div class="arch-branches">
    <div class="arch-card">
      <div class="arch-card-header">📥 1. 输入总线层</div>
      <div class="arch-card-body">
        <ul>
          <li><strong>Channel 0/1/2 数据流</strong>：3 路独立 <code>data, valid, ready</code> 握手接口</li>
          <li><strong>寄存器配置总线</strong>：<code>cmd, addr, wdata, rdata</code> 配置使能/包长/优先级</li>
        </ul>
      </div>
    </div>
    <div class="arch-card">
      <div class="arch-card-header">📦 2. 缓冲与控制核心</div>
      <div class="arch-card-body">
        <ul>
          <li><strong>片上 FIFO</strong>：3 组独立的 <code>8 x 32-bit</code> 深度存储平滑突发</li>
          <li><strong>控制与状态寄存器堆</strong>：维护只读/读写位域与状态指示</li>
          <li><strong>Arbiter 仲裁器</strong>：根据寄存器配置实施轮询或优先级抢占</li>
        </ul>
      </div>
    </div>
    <div class="arch-card highlight" style="border-color:var(--vp-c-brand-1);">
      <div class="arch-card-header">📤 3. 格式化输出层</div>
      <div class="arch-card-body">
        <ul>
          <li><strong>Formatter Logic</strong>：将胜出通道的数据组装成标准帧</li>
          <li><strong>输出引脚</strong>：<code>fmt_data</code> (数据)、<code>fmt_id</code> (通道号)、<code>fmt_sop</code> (包头起始)、<code>fmt_eop</code> (包尾结束)</li>
        </ul>
      </div>
    </div>
  </div>
</div>

### 1.1 核心功能特性
1. **多通道接入**：包含 3 个完全独立的数据写入通道（Channel 0/1/2），支持背压握手（Ready/Valid 协议）。
2. **片上 FIFO**：每个通道配备深度为 8 的数据 FIFO，用于平滑突发写入。
3. **寄存器动态配置**：
   - 通道使能位（`en`）：控制该通道是否允许接收和发送。
   - 数据包长度（`pkg_len`）：配置输出包大小（4、8、16 或 32 个字）。
   - 优先级（`prio`）：可配置轮询（Round-Robin）或严格优先级抢占。
4. **格式化打包输出**：仲裁选中的通道数据由 Formatter 组装为包含包头（SOP, Start of Packet）、通道 ID 标签与包尾（EOP, End of Packet）的帧结构输出。

---

## 2. 工业级 EDA 仿真工具链与 Makefile 脚本

在实际芯片大厂中，验证工程师通过自动化脚本与 Makefile 控制仿真编译与调试工具（Synopsys VCS + Verdi）：

```makefile
# -------------------------------------------------------------
# 典型 UVM + VCS 仿真自动化 Makefile 骨架
# -------------------------------------------------------------
VCS_CMP_OPTS = -sverilog -full64 -kdb -lca \
               -ntb_opts uvm-1.2 \
               -timescale=1ns/1ps \
               -debug_access+all \
               -l compile.log

SIM_OPTS     = +UVM_VERBOSITY=UVM_MEDIUM \
               +UVM_TESTNAME=$(TESTNAME) \
               -l sim_$(TESTNAME).log

all: comp sim

comp:
	vcs $(VCS_CMP_OPTS) -f filelist.f

sim:
	./simv $(SIM_OPTS) +fsdb+autoflush

verdi:
	verdi -ssf tb_top.fsdb &

clean:
	rm -rf simv* csrc *.log *.key *.fsdb ucli.key vc_hdrs.h DVEfiles
```

- **`-ntb_opts uvm-1.2`**：启用 VCS 内置的 UVM 库；
- **`-kdb -debug_access+all`**：生成统一知识库数据库，支撑 Verdi 交互式单步 Debug 与波形追踪；
- **`+fsdb+autoflush`**：实时将仿真波形刷新写入 FSDB 文件，即使仿真中途崩溃也能保留最后时段的波形。

在 Testbench 顶层 `tb_top.sv` 开启波形倾倒：
```system-verilog
initial begin
    $fsdbDumpfile("tb_top.fsdb");
    $fsdbDumpvars(0, tb_top); // 递归倾倒 tb_top 下的所有层次信号
end
```

---

## 3. MCDF UVM 验证环境顶层拓扑搭建

针对 MCDF 的接口规格，搭建完备的 UVM 验证环境：

<div class="arch-tree">
  <div class="arch-root">
    <div class="arch-badge">平台设计全貌</div>
    <div class="arch-title">MCDF UVM 闭环验证环境顶层拓扑</div>
  </div>
  <div class="arch-branches">
    <div class="arch-card">
      <div class="arch-card-header">激励与配置 Agent</div>
      <div class="arch-card-body">
        <ul>
          <li><code>chnl_agent[0..2]</code>：Active 模式，独立产生并驱动 3 路突发通道</li>
          <li><code>reg_agent</code>：Active 模式，负责读写控制寄存器下发配置</li>
        </ul>
      </div>
    </div>
    <div class="arch-card">
      <div class="arch-card-header">输出监测 Agent</div>
      <div class="arch-card-body">
        <ul>
          <li><code>fmt_agent</code>：Passive 模式，只读监听 DUT 格式化输出总线</li>
          <li>提取 <code>fmt_data/sop/eop/id</code> 重组为完整 Transaction</li>
        </ul>
      </div>
    </div>
    <div class="arch-card highlight" style="border-color:var(--vp-c-brand-1);">
      <div class="arch-card-header">参考模型与自动评分</div>
      <div class="arch-card-body">
        <ul>
          <li><code>reference_model</code>：软件级模拟仲裁分发，输出期望数据包</li>
          <li><code>mcdf_scoreboard</code>：自动比对期望值与实际输出，字段级纠错</li>
          <li><code>mcdf_coverage</code>：交叉采集 FIFO 满空、优先级切换与包长边界</li>
        </ul>
      </div>
    </div>
  </div>
</div>

### 3.1 核心组件实现清单
1. **`chnl_agent`**：
   - `chnl_trans`：声明 `rand bit [31:0] data;` 和 `rand int idle_cycles;`
   - `chnl_driver`：在时钟上升沿驱动 `ch_data` 与 `ch_valid`，等待 `ch_ready` 拉高确认。
2. **`reg_agent`**：
   - 驱动配置总线写入控制寄存器，支持只读/读写寄存器操作。
3. **`fmt_agent`**：
   - 被动捕获 `fmt_data`、`fmt_sop`、`fmt_eop` 与 `fmt_id`，重新组装为完整的 `fmt_trans` 事务包广播给 Scoreboard。
4. **`mcdf_reference_model`**：
   - 软件级数据结构维护 3 个虚拟通道 FIFO 与寄存器镜像；
   - 按照当前寄存器设定的优先级调度规则，从虚拟 FIFO 中提取数据并计算出预期的完整格式化帧。
5. **`mcdf_scoreboard`**：
   - 维护期望队列 `exp_q[$]` 与实际队列 `act_q[$]`；
   - 每次接收到数据时进行字段级精确核对，若不匹配立即调用 `` `uvm_error `` 标红报警。

---

## 4. 关键接口与 Driver 驱动实现

### 4.1 通道接口定义 (`chnl_intf.sv`)
```system-verilog
interface chnl_intf(input logic clk, input logic rst_n);
    logic [31:0] ch_data;
    logic        ch_valid;
    logic        ch_ready;
    logic [2:0]  ch_margin;

    clocking drv_cb @(posedge clk);
        default input #1step output #2ns;
        output ch_data, ch_valid;
        input  ch_ready, ch_margin;
    endclocking

    clocking mon_cb @(posedge clk);
        default input #1step;
        input ch_data, ch_valid, ch_ready, ch_margin;
    endclocking
endinterface
```

### 4.2 通道驱动器协议实现 (`chnl_driver.sv`)
```system-verilog
class chnl_driver extends uvm_driver #(chnl_trans);
    `uvm_component_utils(chnl_driver)
    virtual chnl_intf vif;

    function new(string name, uvm_component parent);
        super.new(name, parent);
    endfunction

    task run_phase(uvm_phase phase);
        // 复位时初始化端口
        vif.drv_cb.ch_valid <= 1'b0;
        vif.drv_cb.ch_data  <= 32'h0;
        @(posedge vif.rst_n);

        forever begin
            seq_item_port.get_next_item(req);
            drive_trans(req);
            seq_item_port.item_done();
        end
    endtask

    task drive_trans(chnl_trans tr);
        // 1. 模拟总线空闲间隔 (通过随机约束产生的 idle_cycles)
        repeat (tr.idle_cycles) @(vif.drv_cb);

        // 2. 发起有效写请求
        vif.drv_cb.ch_valid <= 1'b1;
        vif.drv_cb.ch_data  <= tr.data;

        // 3. 等待从机 DUT 拉高 ready 握手确认 (Ready-Valid 协议)
        do begin
            @(vif.drv_cb);
        end while (vif.drv_cb.ch_ready !== 1'b1);

        // 4. 握手结束，撤销 valid
        vif.drv_cb.ch_valid <= 1'b0;
    endtask
endclass
```

---

## 5. 完备的测试用例矩阵设计 (Testcases)

通过派生不同的 `uvm_test`，实现由浅入深的验证覆盖：

| 测试用例名称 | 测试目标 | 验证重点 |
| :--- | :--- | :--- |
| **`mcdf_reg_test`** | 寄存器读写与默认值测试 | 遍历全部控制/状态寄存器，验证复位初始值正确性、读写属性（RW/RO）与位域限制 |
| **`mcdf_single_channel_test`** | 单通道基础连通性测试 | 分别单独使能 Channel 0/1/2，验证短包数据能否零丢包正确格式化输出 |
| **`mcdf_concurrent_test`** | 多通道高并发满载测试 | 3 个通道同时以零延时（`idle_cycles == 0`）疯狂灌入数据，验证 FIFO 满背压机制 |
| **`mcdf_prio_switch_test`** | 仲裁器动态优先级切换 | 在数据持续流动过程中动态改变优先级寄存器，检查 Formatter 是否立即响应抢占 |
| **`mcdf_downsize_test`** | 包长度边界溢出测试 | 轮流配置 `pkg_len` 为 4、8、16、32，测试不同数据包长度截断与重新分包行为 |
| **`mcdf_fault_inject_test`** | 异常注入与容错恢复测试 | 在 FIFO 溢出后强行写入、关闭使能后发送数据，验证硬件保护逻辑与错误状态位 |

---

## 6. 项目总结与简历陈述话术

在面试官问及“请介绍你在 MCDF 项目中的 UVM 验证工作”时，可采用以下 STAR 法则结构作答：

> **面试陈述模版**：
> - **S (情境)**：“该项目是一款面向网络交换的多通道数据格式化芯片，包含 3 路独立数据通道接入、FIFO 缓存、动态优先级仲裁与输出打包格式化功能。”
> - **T (任务)**：“我主要负责通读 Spec 规格书，提炼覆盖率测试点，并从零使用 SystemVerilog 与 UVM 搭建端到端的闭环验证平台。”
> - **A (行动)**：
>   1. “在底层封装了参数化 `chnl_agent` 和 `fmt_agent`，利用 `clocking block` 与 `virtual interface` 消除建立/保持时间竞争；
>   2. 基于 UVM 搭建了分层验证环境，实现了包含轮询和优先级抢占算法的黄金参考模型（Reference Model），通过 TLM `analysis_port` 与 Scoreboard 连接实现自动比对；
>   3. 编写了包含单通道传输、多通道并发背压抢占、寄存器动态重配在内的 6 大类测试序列（Sequence）；
>   4. 针对 FIFO 满空状态、通道交叉仲裁与包长切换编写了覆盖组 `covergroup` 并进行 cross 交叉采样。”
> - **R (结果)**：“在 VCS + Verdi 环境下完成全量 Regression 回归测试，共发现并协助修复了 3 处硬件缺陷（包括 FIFO 满时边界指针错位和优先级动态切换时残包丢字问题），最终实现代码覆盖率 $98.5\%$、功能覆盖率 $100\%$ 的验证收敛目标。”

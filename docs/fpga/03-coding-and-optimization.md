# 第三章 面向 FPGA 底层结构的 RTL 编码与优化

与 ASIC 不同，FPGA 内部的触发器（FF）非常充裕（每个 6-LUT 旁都自带 1~2 个 FF），但组合逻辑级数与布线资源极其宝贵。

---

## 3.1 核心编码与时序优化技巧

### 1. 流水线切割（Pipelining）与逻辑级数控制
- 当一条时序路径上的组合逻辑穿过太多级 LUT（**Logic Levels > 5~7 级**）时，布线延迟会急剧恶化。
- **优化手段**：充分利用 Slice 内闲置的触发器，在长组合逻辑链中间插入流水线寄存器（打拍），将大延迟拆分为多个小周期。

### 2. 高扇出信号优化（High Fanout Reduction）
- 当一个信号（如全局软复位、模块级使能 `en`、状态机广播状态）同时驱动成百上千个寄存器或 LUT 时，由于物理距离跨度大，布线延迟将严重超标。
- **优化手段**：手动进行**寄存器复制（Register Duplication）**，或添加 `(* max_fanout = 32 *)` 综合属性，防止综合器把复制的寄存器优化合并掉（配合 `(* dont_touch = "true" *)` 或 `(* equivalent_register_removal = "no" *)`）：

```verilog
// 限制该控制寄存器的最大扇出为 32，超出时由综合器自动复制多份寄存器分担驱动负载
(* max_fanout = 32 *) reg ctrl_enable_q;
```

### 3. 跨时钟域同步器防移动属性（`ASYNC_REG`）
在编写打两拍同步器时，务必添加 `(* ASYNC_REG = "TRUE" *)` 属性。它的两大硬件作用是：
1. 防止综合器对同步触发器做逻辑优化或重定时（Retiming）；
2. 强制布局布线器将这两级触发器放置在**同一个 Slice 内部紧挨着的相邻位置**，使两级寄存器之间的布线延迟降到极致，从而留给亚稳态最大的恢复时间（提升 MTBF）。

```verilog
(* ASYNC_REG = "TRUE" *) reg sync_d1, sync_d2;

always @(posedge clk_dst or negedge rst_n) begin
    if (!rst_n) begin
        sync_d1 <= 1'b0;
        sync_d2 <= 1'b0;
    end else begin
        sync_d1 <= async_sig_in;
        sync_d2 <= sync_d1;
    end
end
```

---

::: tip 待补充
欢迎在此继续补充状态机独热码（One-Hot）在 FPGA 下的优势、移位寄存器 `SRL16E` 推断规范等实战笔记！
:::

# 01. 静态时序分析 (STA) 与建立/保持时间

静态时序分析（Static Timing Analysis, STA）是数字芯片设计中验证电路在给定工作频率下能否正常运行的最关键手段。

---

## 1. 基本定义与概念

- **建立时间 ($T_{setup}$)**：在时钟有效沿到来**之前**，数据信号必须保持稳定不变的最小时间。
- **保持时间 ($T_{hold}$)**：在时钟有效沿到来**之后**，数据信号必须继续保持稳定不变的最小时间。

---

## 2. 核心时序计算公式

设发射触发器为 $FF_1$，捕获触发器为 $FF_2$，时钟周期为 $T_{clk}$：

### 建立时间约束 (Setup Check - 决定芯片最大工作频率)
$$T_{cq} + T_{comb\_max} \le T_{clk} + T_{skew} - T_{setup}$$

- **Setup Slack（建立时间裕量）**：
  $$Slack_{setup} = (T_{clk} + T_{skew} - T_{setup}) - (T_{cq} + T_{comb\_max})$$
- 若 $Slack_{setup} < 0$，发生 Setup 违例。
- **修复方案**：降频、流水线切分组合逻辑（插入寄存器）、更换更快的标准逻辑单元、减小连线延迟。

### 保持时间约束 (Hold Check - 与时钟周期无关！)
$$T_{cq} + T_{comb\_min} \ge T_{skew} + T_{hold}$$

- **Hold Slack（保持时间裕量）**：
  $$Slack_{hold} = (T_{cq} + T_{comb\_min}) - (T_{skew} + T_{hold})$$
- 若 $Slack_{hold} < 0$，发生 Hold 违例。
- **修复方案**：插入 Delay Buffer（缓冲器），增大组合逻辑最小延迟 $T_{comb}$。

---

::: tip 待补充
欢迎在此记录更多关于 Recovery / Removal 时间、多时钟周期路径 (Multicycle Path) 的考点！
:::

# 03. NPC 硬件设计：手搓 RISC-V 处理器

NPC（New Processor Core）使用 HDL 硬件描述语言实现真实的 RISC-V 核心，并通过 DiffTest（与 NEMU 差分测试）进行精确硬件级比对。

---

## 处理器演进路线

1. **单周期 CPU 设计**：
   - 寄存器堆 (Register File)
   - 算术逻辑单元 (ALU)
   - 指令存储器与数据存储器 (IMem & DMem)
2. **流水线化 CPU 设计**：
   - 五级流水线（IF, ID, EX, MEM, WB）
   - 数据冒险（Data Hazard）与旁路转发（Forwarding Unit）
   - 控制冒险（Control Hazard）与分支预测（Branch Predictor）
   - 结构冒险与流水线暂停（Stall）机制
3. **总线对接**：
   - AXI4-Lite / AXI4 总线主从接口实现

---

::: tip 待补充
欢迎在此记录 NPC 硬件代码结构与波形调试体验！
:::

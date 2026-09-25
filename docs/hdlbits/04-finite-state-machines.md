# 04. 有限状态机实战 (Finite State Machines)

状态机（FSM）是数字系统控制通路（Control Path）的核心灵魂。HDLBits 中包含大量经典状态机进阶题目。

---

## 状态机标准三段式写法范式

```verilog
// 1. 状态编码定义（建议使用 localparam）
localparam S_IDLE  = 2'b00;
localparam S_READ  = 2'b01;
localparam S_WRITE = 2'b10;

reg [1:0] current_state, next_state;

// 第一段：时序逻辑，更新状态寄存器
always @(posedge clk or negedge rst_n) begin
    if (!rst_n)
        current_state <= S_IDLE;
    else
        current_state <= next_state;
end

// 第二段：组合逻辑，计算下一状态次态转移
always @(*) begin
    next_state = current_state;
    case (current_state)
        S_IDLE:  if (start) next_state = S_READ;
        S_READ:  if (read_done) next_state = S_WRITE;
        S_WRITE: if (write_done) next_state = S_IDLE;
        default: next_state = S_IDLE;
    endcase
end

// 第三段：时序/组合逻辑，产生输出信号
// 推荐使用寄存器输出以消除组合逻辑毛刺
```

---

::: tip 待补充
欢迎补充 Mealy 型与 Moore 型状态机的差异与练习题解！
:::

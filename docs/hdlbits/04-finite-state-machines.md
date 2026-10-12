# 04. 有限状态机实战 (Finite State Machines)

状态机（FSM）是数字系统控制通路（Control Path）的核心灵魂。HDLBits 中包含大量经典状态机进阶题目。

---

## 状态机二段式写法范式

```verilog
// 1. 状态编码定义（建议使用 localparam）
localparam IDLE  = 2'b00;
localparam READ  = 2'b01;
localparam WRITE = 2'b10;

reg [1:0] state;
// 第一段：时序逻辑，状态转移
always @(posedge clk or negedge rst_n) begin
    if (!rst_n)
        state <= IDLE;
    else case（state）
        IDEL: if else
        READ: 
end

// 第二段：输出
always @(posedge clk or negedge rst_n) begin
    if (!rst_n)
        reg <= 0;
    else if(state == )
        reg <= ;
end



---

::: tip 待补充
欢迎补充 Mealy 型与 Moore 型状态机的差异与练习题解！
:::

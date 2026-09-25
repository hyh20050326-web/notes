# 01. 语言基础与入门 (Getting Started)

记录 HDLBits 前期语法与基础题目笔记，您可以在网页端直接按 `.` 键开始编辑补充自己的解题代码与解析。

---

## 经典题目记录

### 1. Step one (最简单的输出信号)
- **要求**：使输出 `zero` 恒为 0。
- **参考代码**：
  ```verilog
  module top_module(
      output wire zero
  );
      assign zero = 1'b0; // 驱动为低电平
  endmodule
  ```

### 2. Output ZERO
- 知识点：`wire` 的连续赋值语句 `assign`。

---

### 3. for循环
- **要求**：统计输入向量中“1”的个数。请构建一个用于255位输入向量的数量计数电路。
- **参考代码**：
  ```verilog
  module top_module( 
    input [254:0] in,
    output reg [7:0] out );

    always@(*) begin
        out = 8'd0;
        for(int i = 0;i < 255;i = i + 1)
            out = out + in[i];
    end
  endmodule

  
::: tip 待补充
点击右上方或底部的「在 GitHub 上编辑此页」，记录您的刷题思路。
:::

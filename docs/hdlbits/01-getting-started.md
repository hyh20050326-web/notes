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

::: tip 待补充
点击右上方或底部的「在 GitHub 上编辑此页」，记录您的刷题思路。
:::

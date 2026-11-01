# 01. F阶段

记录一生一芯预学习过程中的环境准备、Linux 常用技能、数字电路逻辑与 Verilator 仿真探索。

---

## 学习任务清单

- [ ] Linux 环境与命令行快捷技巧（tmux, vim, bash 脚本）
- [ ] C 语言系统级编程（指针、内存布局、Makefile 构建工具）
- [ ] 数字电路与 Verilator 快速上手（编写 C++ Testbench 驱动硬件模块）
- [ ] NVBoard 虚拟 FPGA 开发板的按键与数码管驱动接入

---

## F3：数字电路逻辑基础

### 💡 思考题：前导0和前导1的计数

::: info 题目背景与描述
计算机有时候需要计算一个数据的“**前导0**”的数量，即需要计算该数据的二进制表示的高位有多少个连续的 `0`。假设数据的位宽是 16 位，那么对于数据 `16392`，其二进制表示是 `0b0100000000001000`，因此前导0的数量为 1。

类似可定义“**尾随0**”，即数据的二进制表示的低位有多少个连续的 `0`。同样以数据 `16392` 为例，其尾随0的数量为 3。类似可定义“**前导1**”和“**尾随1**”。

**思考一下，如何通过优先编码器快速计算它们？**
:::

---

### 📝 核心原理与解答

在硬件体系结构中，这类操作通常对应处理器指令集中的 **CLZ**（Count Leading Zeros）与 **CTZ**（Count Trailing Zeros）（例如 RISC-V 的 Zbb 位操作扩展）。

核心突破口在于：**优先编码器（Priority Encoder）本质上就是寻找“最高有效位 1”或“最低有效位 1”的位置。**

#### 1. 前导0计数（CLZ, Count Leading Zeros）

设有一个标准 **16-4 高位优先编码器**：
- **输入**：`in[15:0]`
- **输出**：`pos[3:0]`（指示最高有效位 `1` 所在的位置下标，范围为 $0 \sim 15$）
- **有效指示**：`valid`（若输入全为 0，则 `valid = 0`，此时输出 `pos` 无效；否则 `valid = 1`）

**推导分析**：
- 若最高位 `1` 出现在下标为 `pos` 的位置，则高于该位的索引范围为 $[15, pos+1]$，这些位必须全为 `0`。
- 因此连续前导 0 的个数为：
  $$\text{CLZ} = 15 - pos$$
- 在 4 位无符号数中，减法 $15 - pos$ 恰好等于按位取反：
  $$15 - pos = 4'b1111 - pos = \sim pos$$
- **边界条件**：若输入全为 0（`valid == 0`），则 16 位全是 0，$\text{CLZ} = 16$。

> **结论公式**：
> $$\text{CLZ} = \text{valid} \ ? \ (15 - pos) : 16 \quad (\text{或 } \text{valid} \ ? \ (\sim pos) : 16)$$

---

#### 2. 尾随0计数（CTZ, Count Trailing Zeros）

尾随 0 是从低位（LSB）向高位扫描，有两种实现思路：

- **思路 A（位反转法 + 复用高位优先编码器）**：
  将输入数据进行**位序倒置（Bit Reversal）**，即第 0 位变成第 15 位、第 1 位变成第 14 位……反转后原先的“尾随0”就变换成了“前导0”，直接复用前导 0 的高位优先编码器即可：
  $$\text{CTZ}(in) = \text{CLZ}(\text{reverse}(in))$$
- **思路 B（低位优先编码器）**：
  若硬件提供扫描最低有效位的低位优先编码器，设最低的 `1` 位于下标 $pos_{low}$：
  - 则低于 $pos_{low}$ 的位（即 $[pos_{low}-1, 0]$）全为 0，连续 0 的数量直接就是 $pos_{low}$！
  - 当全 0 时，输出同样为 16。

---

#### 3. 前导1（CLO）与尾随1（CTO）计数

利用布尔代数的对偶性：**“连续的 1”等价于“按位取反后连续的 0”**。

- 计算前导 1（CLO）：先将输入按位取反（`~in`），再送入 **前导0（CLZ）** 模块。
  $$\text{CLO}(in) = \text{CLZ}(\sim in)$$
- 计算尾随 1（CTO）：先将输入按位取反（`~in`），再送入 **尾随0（CTZ）** 模块。
  $$\text{CTO}(in) = \text{CTZ}(\sim in)$$

---

### 💻 Verilog 硬件描述实现参考

以参数化 16 位输入为例，我们可以构建清晰可综合的 RTL 逻辑：

```verilog
module leading_trailing_zeros #(
    parameter WIDTH = 16
)(
    input  wire [WIDTH-1:0]        in,
    output reg  [$clog2(WIDTH):0]  clz, // 前导0 (0~16)
    output reg  [$clog2(WIDTH):0]  ctz, // 尾随0 (0~16)
    output wire [$clog2(WIDTH):0]  clo, // 前导1 (0~16)
    output wire [$clog2(WIDTH):0]  cto  // 尾随1 (0~16)
);

    integer i;

    // 前导 0 逻辑 (从 MSB 向 LSB 扫描)
    always @(*) begin
        clz = WIDTH; // 默认全 0 时的值
        for (i = WIDTH - 1; i >= 0; i = i - 1) begin
            if (in[i]) begin
                clz = (WIDTH - 1) - i;
                break;
            end
        end
    end

    // 尾随 0 逻辑 (从 LSB 向 MSB 扫描)
    always @(*) begin
        ctz = WIDTH; // 默认全 0 时的值
        for (i = 0; i < WIDTH; i = i + 1) begin
            if (in[i]) begin
                ctz = i;
                break;
            end
        end
    end

    // 前导 1 与 尾随 1 逻辑实例化/复用（输入按位取反）
    wire [$clog2(WIDTH):0] clz_inv, ctz_inv;
    leading_trailing_zeros #(.WIDTH(WIDTH)) u_inv (
        .in ( ~in ),
        .clz( clo ),
        .ctz( cto ),
        .clo(),
        .cto()
    );

endmodule
```

::: tip 💡 拓展思考：计算机体系结构中的应用
1. **IEEE 754 浮点运算**：在浮点加减法完成尾数相加后，需要对结果进行“规格化（Normalize）”，此时必须通过 **CLZ** 快速找出最高位的 1，确定需要左移的位数。
2. **RISC-V Zbb 位操作扩展**：专门引入了 `clz`、`ctz`、`cpop` 指令，单周期完成前导零计数，广泛用于哈希表桶计算、位图索引分配及密码学算法中。
:::


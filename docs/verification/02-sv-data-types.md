# 02. SystemVerilog 数据类型精粹与数组操作

在 SystemVerilog 中，丰富的数据类型和灵活的动态数组管理是支撑高效验证平台的基石。合理选用数据类型不仅能让测试平台代码简洁易读，更能大幅**优化仿真器内存消耗、提升仿真执行速度**。

---

## 1. 内建数据类型：四态 vs 二态

SystemVerilog 将数据类型清晰地划分为**四态逻辑（4-state）**与**二态逻辑（2-state）**两大家族：

| 数据类型 | 状态位宽 | 逻辑状态 | 默认符号 (Sign) | 默认初值 | 典型应用场景 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`logic`** | 用户自定义位宽 | 4态 (`0, 1, X, Z`) | 无符号 unsigned | `X` | 替代 Verilog 的 `reg` 和单驱动 `wire`，用于硬件接口连线 |
| **`bit`** | 用户自定义位宽 | 2态 (`0, 1`) | 无符号 unsigned | `0` | 测试平台中的纯数字事务数据包 (Transaction payload) |
| **`byte`** | 8 位 | 2态 (`0, 1`) | **有符号 signed** | `0` | 单字节协议数据、网络帧解析 |
| **`int`** | 32 位 | 2态 (`0, 1`) | 有符号 signed | `0` | 计数器、循环控制变量、数组索引 |
| **`longint`** | 64 位 | 2态 (`0, 1`) | 有符号 signed | `0` | 大位宽时钟周期计数、大容量存储器寻址 |

### 🚀 二态类型的工程价值与避坑指南
- **仿真加速**：二态数据在底层仅需 1 个比特位内存存储，而四态需要 2 个比特位（分别存储 Value 与 Unknown/High-Z），因此在纯验证层（如 Generator、Driver 内部变量）广泛采用 `bit/int` 可以**显著降低仿真内存占用并提升速度**。
- **初值与 X 传播陷阱**：
  - 二态变量上电默认为 `0`，而四态变量默认为 `X`；
  - 若 DUT 产生的未初始化未知态 `X` 输入到一个 `bit` 类型的测试平台变量中，仿真器会**隐式将其强制转换为 0**，从而在不知不觉中“抹杀”了潜在的设计未复位 Bug！
  - **设计准则**：与 DUT 物理引脚直接打交道的部分（如 Interface 采样信号），务必保留 `logic` 四态，确保能够捕获芯片未复位导致的 `X` 态传播。

---

## 2. 数组家族：四大存储结构全景对比

验证过程中经常需要处理大量数据包与复杂协议帧，SystemVerilog 提供了四种各具特色的数组类型：

<div class="arch-tree">
  <div class="arch-root">
    <div class="arch-badge">数据结构全景</div>
    <div class="arch-title">SystemVerilog 核心数组类型家族</div>
  </div>
  <div class="arch-branches">
    <div class="arch-card">
      <div class="arch-card-header">📌 定宽数组 (Fixed-size Array)</div>
      <div class="arch-card-body">
        <ul>
          <li><strong>编译时确定大小</strong>：固定内存连续分配</li>
          <li><strong>合并型 (packed)</strong>：比特位紧凑拼接，支持位切片</li>
          <li><strong>非合并型 (unpacked)</strong>：各元素独立存放，访问效率高</li>
        </ul>
      </div>
    </div>
    <div class="arch-card">
      <div class="arch-card-header">⚡ 动态数组 (Dynamic Array)</div>
      <div class="arch-card-body">
        <ul>
          <li><strong>运行期动态开辟</strong>：<code>dyn = new[N]</code></li>
          <li>底层连续堆内存，支持 <code>.size()</code> 与 <code>.delete()</code></li>
          <li><strong>适用场景</strong>：变长网络数据报、固定批次传输</li>
        </ul>
      </div>
    </div>
    <div class="arch-card">
      <div class="arch-card-header">📥 队列 (Queue)</div>
      <div class="arch-card-body">
        <ul>
          <li><strong>动态伸缩双端容器</strong>：<code>[$]</code> 声明，无需 <code>new</code></li>
          <li>原生方法：<code>push_back</code> / <code>pop_front</code> / <code>insert</code></li>
          <li><strong>适用场景</strong>：FIFO 硬件缓冲池与事务暂存池</li>
        </ul>
      </div>
    </div>
    <div class="arch-card">
      <div class="arch-card-header">🗺️ 关联数组 (Associative Array)</div>
      <div class="arch-card-body">
        <ul>
          <li><strong>稀疏索引映射表</strong>：<code>assoc[key_type]</code> 类似字典</li>
          <li>仅对真实写入的离散地址消耗物理内存</li>
          <li><strong>适用场景</strong>：32/64 位 CPU 稀疏大容量 Memory 建模</li>
        </ul>
      </div>
    </div>
  </div>
</div>

### 1. 定宽数组 (Fixed-size Array)：合并型 vs 非合并型

SystemVerilog 中通过维度方括号声明在变量名的**左侧**还是**右侧**，来区分数组是连续紧凑存放还是独立离散存放：

- **合并型数组 (Packed Array)**：
  - **声明位置**：维度位于变量名**左侧**，例如 `logic [3:0][7:0] bytes;`
  - **存储特征**：物理上作为**单一大位宽的连续位向量 (Bit Vector)** 存放，元素间无缝拼接，无内存对齐间隙。
  - **操作权限**：支持直接当成大整数进行整体赋值、数学加减、逻辑运算以及跨元素位切片（如 `bytes[23:8]`）。
- **非合并型数组 (Unpacked Array)**：
  - **声明位置**：维度位于变量名**右侧**，例如 `logic [7:0] words [0:3];`（或简写 `words [4]`）
  - **存储特征**：每个元素在内存中占据**独立的存储字空间**（类似 C 语言数组），元素之间物理隔离，仿真器对其拥有极高的独立寻址优化。
  - **操作权限**：不能直接作为一个大整数参与算术运算，赋值需采用聚合列表 `'{...}` 形式。

#### 💡 进阶：合并与非合并的混合数组 (Mixed Array)

在工程中（特别是寄存器堆或总线缓存建模时），最常见的形式是将两者结合使用：

![合并与非合并的混合数组](/sv-mixed-array.jpg)

```systemverilog
bit [3:0][7:0] barray [3];//或[2:0]或[0:2]
```

**维度与索引层级解析**：

1. **先定位非合并维度（找哪一行）**：
   - 变量名右侧的 `[3]` 是**非合并维度**，代表整个数组拥有 **3 个独立行**：`barray[0]`、`barray[1]`、`barray[2]`。
   - `barray[2]`：直接定位并选中**第 2 行整个 32 位合并向量**（如上图最下方完整实线框所示），可直接当 32-bit 整数读写。
2. **再由外向内解嵌套合并维度（找字节与位）**：
   - 变量名左侧的 `[3:0][7:0]` 是**合并维度**，决定了每一行的数据结构由 4 个 8-bit 字节拼接而成。
   - `barray[0][3]`：定位到第 0 行中索引为 `[3]` 的**高位字节**（8 位宽 `logic [7:0]`，如左上方框选部分）。
   - `barray[0][1][6]`：定位到第 0 行、第 1 个字节中的**第 6 个 bit**（如右上方小方框所示）。

> 📌 **寻址心法**：索引引用时遵循**从左到右逐级解包**原则——先解最外层的非合并行索引 `[row]`，再从左到右解析合并维度的字节 `[byte]` 与比特 `[bit]`。

### 2. 动态数组 (Dynamic Array)
在仿真运行之前不知道数组的具体大小，必须在运行期根据参数动态开辟：

```system-verilog
int dyn[];                   // 声明动态数组，此时为空
initial begin
    dyn = new[5];            // 分配 5 个整数元素的连续内存
    foreach (dyn[i]) dyn[i] = i * 10;
    
    // 扩展数组并保留原有数据
    dyn = new[10](dyn);      // 重新开辟 10 个元素空间，并将原先 5 个元素复制进来
    $display("dyn size = %0d", dyn.size()); // 输出 10
    
    dyn.delete();            // 释放内存，size 变为 0
end
```

### 3. 队列 (Queue)：FIFO 建模利器
队列是数字验证中最常用、最灵活的容器。无需提前 `new`，元素增删自动伸缩内存，支持头尾高效插入删除：

```system-verilog
int q[$];                    // 声明一个整数队列，[$] 表示无界队列
int item;

initial begin
    q.push_back(10);         // 尾部推入: {10}
    q.push_back(20);         // 尾部推入: {10, 20}
    q.push_front(5);         // 头部推入: {5, 10, 20}
    
    item = q.pop_front();    // 头部弹出: item=5, q={10, 20}
    item = q.pop_back();     // 尾部弹出: item=20, q={10}
    
    q.insert(1, 15);         // 在索引 1 处插入元素 15: {10, 15}
    q.delete(0);             // 删除索引 0 的元素: {15}
    $display("Queue len = %0d", q.size());
end
```

### 4. 关联数组 (Associative Array)：稀疏矩阵与大容量 Memory
当需要对一个 32 位或 64 位全地址空间的 RAM 进行建模时，若使用定宽数组将耗费数十 GB 内存直接撑爆机器。**关联数组仅在被写入地址时才动态分配该节点的内存**，是稀疏存储器的完美解法：

```system-verilog
// 键为 32 位地址，值为 32 位数据
int assoc_mem[int]; 
int addr;

initial begin
    // 稀疏写入，只有这 3 个地址占用实际内存
    assoc_mem[32'h0000_1000] = 32'hAAAA_BBBB;
    assoc_mem[32'hFFFF_0000] = 32'h1234_5678;
    assoc_mem[32'hA5A5_5A5A] = 32'hDEAD_BEEF;

    // 检查某个地址是否存在
    if (assoc_mem.exists(32'h0000_1000)) begin
        $display("Address hit! Data = 0x%08X", assoc_mem[32'h0000_1000]);
        // 输出: Address hit! Data = 0xAAAABBBB
    end

    // 遍历关联数组（仿真器底层按 Key 升序有序遍历）
    if (assoc_mem.first(addr)) begin
        do begin
            $display("Addr: 0x%08X -> Data: 0x%08X", addr, assoc_mem[addr]);
        end while (assoc_mem.next(addr));
    end
    /* 遍历输出依次为：
       Addr: 0x00001000 -> Data: 0xAAAABBBB
       Addr: 0xA5A55A5A -> Data: 0xDEADBEEF
       Addr: 0xFFFF0000 -> Data: 0x12345678
    */
end
```

### 📊 数组选型快速决策表

| 场景需求 | 最佳选型 | 原因 |
| :--- | :--- | :--- |
| **总线包固定长度传输**（如已知数据报长度） | 动态数组 `type arr[]` | 连续内存布局，索引随机访问最快 |
| **DUT 输入/输出缓冲队列、FIFO 缓存建模** | 队列 `type q[$]` | 极度灵活，原生支持先进先出 `push_back / pop_front` |
| **32/64 位 CPU 稀疏内存、地址映射表** | 关联数组 `type arr[key_type]` | 内存按需分配，避免巨大空闲地址浪费系统内存 |
| **硬件引脚矢量、状态寄存器位图** | 合并型定宽数组 `logic [31:0]` | 支持直接按位逻辑运算与位切片操作 |

---

## 3. 数组内建方法 (Array Methods)

SystemVerilog 为数组提供了丰富的定位（Locator）和缩减（Reduction）方法，极大简化了验证中的统计与断言比对代码：

```system-verilog
int arr[] = '{1, 6, 3, 8, 3, 9, 2};//’表示不是拼接
int q[$];
int res_int;

initial begin
    // 1. 定位方法: find (找出所有满足条件的元素)
    q = arr.find(x) with (x > 3);            // 返回 {6, 8, 9}
    
    // 2. 定位方法: find_index (找出所有满足条件的元素下标)
    q = arr.find_index(x) with (x == 3);      // 返回 {2, 4}
    
    // 3. 最大值与最小值 (注意返回值是队列)
    q = arr.max();                            // 返回 {9}
    q = arr.min();                            // 返回 {1}
    
    // 4. 去重
    q = arr.unique();                         // 剔除重复的 3
    
    // 5. 缩减计算: 求和与异或
    res_int = arr.sum();                      // 1+6+3+8+3+9+2 = 32
    res_int = arr.xor();                      // 所有元素进行连续异或运算
end
```

::: danger 致命避坑：数组求和溢出
`arr.sum()` 的计算中间位宽**默认与数组元素的位宽相同**！  
如果数组元素是 8-bit 的 `byte`，求和结果超过 255 时将发生**回绕溢出截断**！  
**标准解法**：使用 `arr.sum(x) with (32'(x))` 强制使用 32 位宽累加！
:::

---

## 4. 自定义类型、结构体与枚举

### 1. Packed 结构体在总线协议中的威力
使用 `packed` 关键字声明的结构体，在底层会被压缩为一个纯粹的连续位向量，可以直接整体赋值给引脚，也可以按字段拆分访问：

```system-verilog
typedef struct packed {
    logic [7:0]  preamble;    // 前导码
    logic [15:0] length;      // 负载长度
    logic [7:0]  cmd_type;    // 命令字
} packet_header_t;

packet_header_t header;
logic [31:0] bus_data;

initial begin
    header.preamble = 8'hAA;
    header.length   = 16'd512;
    header.cmd_type = 8'h01;
    
    // 因为是 packed，可以直接像一个 32-bit vector 一样赋值到总线上！
    bus_data = header; 
end
```

### 2. 枚举类型 (Enum)：增强代码可读性与防呆
枚举类型默认是 32 位 `int`，从 0 递增，也可以自定义基类型：

```system-verilog
typedef enum logic [1:0] {
    IDLE  = 2'b00,
    SETUP = 2'b01,
    READ  = 2'b10,
    WRITE = 2'b11
} fsm_state_e;

fsm_state_e cur_state;

initial begin
    cur_state = SETUP;
    $display("Current State = %s", cur_state.name()); // 输出字符串 "SETUP"
    cur_state = cur_state.next();                     // 切换为 READ
end
```
- 使用 `.name()` 方法可以直接打印枚举变量的字符串名称，避免在仿真波形和日志里只能看到冷冰冰的数字代码。
- 枚举赋值受到强类型检查保护：不能直接将整数赋给枚举类型，必须使用强制类型转换：`cur_state = fsm_state_e'(2'b10)`。

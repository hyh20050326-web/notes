# 05. 受约束的随机激励 (CRV) 实战与陷阱

在芯片验证中，仅仅产生无序的纯随机数是没有意义的，必须让随机激励在**符合协议物理规范（合法解）**的前提下，精准冲撞设计的**极端边界场景（Corner Cases）**。这就是受约束的随机激励技术（Constrained-Random Verification, CRV）。

---

## 1. 随机变量声明：`rand` vs `randc`

SystemVerilog 在类内提供两个随机修饰关键字：

```system-verilog
class BusTransaction;
    rand  bit [7:0] data; // 普通随机：每一次 randomize() 均独立均匀分布
    randc bit [2:0] ch_id;// 周期循环随机：解空间完全遍历一遍后才重新洗牌
endclass
```

| 关键字 | 物理机制 | 解空间耗尽行为 | 适用场景 |
| :--- | :--- | :--- | :--- |
| **`rand`** | 类似标准掷骰子，前后两次随机独立可能重复 | 始终从全解空间抽取 | 数据包负载数据、地址、延迟拍数 |
| **`randc`** | 类似从一副牌中摸牌，摸出一张弃一张 | 空间所有可能值完全出现一次后，重新打乱洗牌 | 少量有限状态枚举、无重复通道号选择 |

::: warning 性能注意
`randc` 在底层需要维护一个状态历史列表来跟踪哪些值已被选取，当变量位宽较大（如大于 16 位）时，会消耗大量内存导致求解器速度急剧变慢！因此 `randc` 仅适用于小位宽变量。
:::

---

## 2. 核心约束语法全解

### 2.1 范围约束与集合操作 (`inside`)
```system-verilog
class Packet;
    rand bit [31:0] addr;
    
    constraint c_addr_range {
        // 地址落在 [0x1000:0x2000] 闭区间，或者等于 0x5000，或落在 [0x8000:0x9000]
        addr inside { [32'h1000 : 32'h2000], 32'h5000, [32'h8000 : 32'h9000] };
        
        // 取反约束：addr 绝不能在 0x0 ~ 0xFF 之间
        !(addr inside { [32'h0 : 32'hFF] });
    }
endclass
```

### 2.2 权重分布约束 (`dist`)：`:=` vs `:/`（经典易考点）
在总线测试中，我们希望读操作占 $80\%$，写操作占 $20\%$，或者某些特定区间有更高的命中概率：

```system-verilog
class Command;
    rand bit [1:0] op;
    rand bit [7:0] len;

    constraint c_weight {
        // 1. 单值权重 :=
        op dist { 2'b00 := 80, 2'b01 := 20 }; // 00 出现概率 80/100，01 概率 20/100

        // 2. 区间权重 := vs :/
        // := 每个单独值的权重都是 40
        // len 在 [1:4] 内有 4 个数，每个数的权重都是 40，区间总权重 160
        len dist { 0 := 60, [1:4] := 40 };

        // :/ 区间内所有可能值平分权重
        // [1:4] 的总权重是 40，每个单独值的权重是 40 / 4 = 10
        // len dist { 0 := 60, [1:4] :/ 40 };
    }
endclass
```

### 2.3 条件约束：`->` (蕴含) 与 `if...else`
```system-verilog
class Frame;
    rand bit       is_broadcast;
    rand bit [7:0] dest_id;

    constraint c_broadcast {
        // 蕴含操作符：如果 is_broadcast 为 1，则 dest_id 强制为 8'hFF
        is_broadcast -> (dest_id == 8'hFF);
        
        // 等价的 if-else 风格
        if (!is_broadcast) {
            dest_id inside { [8'h01 : 8'hFE] };
        }
    }
endclass
```

---

## 3. 双向约束与 `solve...before` 概率引导

### 3.1 什么是双向约束 (Bidirectional Constraint)？
在 SystemVerilog 中，**所有约束是同时被联立求解的**，约束书写的先后顺序对结果没有任何影响。例如：

```system-verilog
rand bit       x;
rand bit [1:0] y;

constraint c_bidir {
    (x == 0) -> (y == 0);
}
```
此时求解器并不是“先算 x 再算 y”，而是从 `(x, y)` 构成的笛卡尔积所有合法组合集合中均匀选取：
- 当 $x=0$ 时，满足条件的 $y$ 只有 `0`，组合为 `(0, 0)`（1 种可能）；
- 当 $x=1$ 时，$y$ 可以为 `0, 1, 2, 3`，组合为 `(1, 0), (1, 1), (1, 2), (1, 3)`（4 种可能）；
- 合法总状态空间一共有 $1 + 4 = 5$ 种，因此 $x=0$ 被选中的概率只有 **$1/5 = 20\%$**！这可能违背了“$x$ 默认应各占 $50\%$”的初衷！

### 3.2 使用 `solve ... before ...` 引导概率分布
为了让 $x$ 保持 50/50 的均匀分布，可以显式引导求解器的选择优先级：

```system-verilog
constraint c_bidir_fixed {
    solve x before y; // 先决定 x 的值，再在确定的 x 下求解 y
    (x == 0) -> (y == 0);
}
```
- **核心澄清**：`solve x before y` **不改变任何解空间范围**（合法解依旧是那 5 种），**它只改变最终解在统计上的概率权重分布**！此时 $x=0$ 的选中概率被纠正为 $50\%$。

---

## 4. 动态内嵌约束与软约束 (`soft`)

### 4.1 内嵌约束 (`randomize() with`)
无需修改类定义，在调用 `randomize()` 的瞬时动态叠加临时约束：

```system-verilog
Packet pkt = new();

initial begin
    // 强制本次随机的 addr 为 0，且 data 必须在特定区间
    assert(pkt.randomize() with {
        addr == 32'h0000;
        data inside { [10 : 50] };
    });
end
```

### 4.2 软约束 (`soft`) 避免冲突报错
在类中定义的默认约束如果被外部 `with` 条件抵触，求解器会报 **Constraint Conflict（约束冲突）** 并返回 0。使用 `soft` 可以将约束设为默认预设值，允许外部轻易覆盖：

```system-verilog
class Config;
    rand bit [15:0] size;
    // 软约束：默认情况下 size < 1024，但允许外部任意覆盖而不报错
    constraint c_size_soft { soft size < 1024; }
endclass

initial begin
    Config cfg = new();
    // 外部需要大包测试，直接覆盖，不会报约束冲突！
    assert(cfg.randomize() with { size == 2048; });
end
```

---

## 5. 随机控制回调钩子与工程规范

### 5.1 `pre_randomize()` 与 `post_randomize()`
在调用 `randomize()` 的前后，仿真器会自动执行两个回调函数：

<div class="flow-steps">
  <div class="flow-step-box">1. 外部调用 <code>obj.randomize()</code></div>
  <span class="flow-arrow">➔</span>
  <div class="flow-step-box">2. 自动钩子 <code>pre_randomize()</code><br><small style="color:var(--vp-c-text-2);">动态开启/关闭约束或调整位宽</small></div>
  <span class="flow-arrow">➔</span>
  <div class="flow-step-box" style="border-color:var(--vp-c-brand-1);">3. 约束求解器联立方程求解<br><small style="color:var(--vp-c-brand-1);">计算符合范围与分布的合法解</small></div>
  <span class="flow-arrow">➔</span>
  <div class="flow-step-box">4. 自动钩子 <code>post_randomize()</code><br><small style="color:var(--vp-c-text-2);">根据解立即计算 CRC / 状态映射</small></div>
  <span class="flow-arrow">➔</span>
  <div class="flow-step-box">5. 返回状态 (1 成功 / 0 冲突失败)</div>
</div>

```system-verilog
class EthFrame;
    rand bit [47:0] src_mac;
    rand bit [47:0] dst_mac;
    rand bit [7:0]  payload[];
    bit [31:0]      fcs_crc; // 校验码

    // 在随机前可以根据外部模式开关打开或关闭部分约束
    function void pre_randomize();
        // 设置动态数组大小
        payload = new[64];
    endfunction

    // 在随机完成后立即计算校验和
    function void post_randomize();
        this.fcs_crc = calculate_crc(payload);
    endfunction
endclass
```

### 5.2 黄金工程纪律：永远使用 `assert(obj.randomize())`
在实际芯片工程中，**严禁裸写 `obj.randomize();`**！如果产生约束冲突，求解器将默默返回 `0` 并且保持对象原值不变，导致测试环境以为激励正常驱动，掩盖了严重的测试缺陷。

```system-verilog
// ❌ 危险写法：静默失败无法察觉
pkt.randomize();

//  标准工业级写法：失败立即阻断仿真并打印关键日志
if (!pkt.randomize()) begin
    $error("Fatal: Packet randomization failed at time %0t!", $time);
    $finish;
end

// 极简断言风格
assert(pkt.randomize()) else $fatal("Randomization failed!");
```

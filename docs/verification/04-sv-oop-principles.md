# 04. 面向对象编程 (OOP) 核心指南与 Blueprint 模式

面向对象编程（Object-Oriented Programming, OOP）是 SystemVerilog 与传统 Verilog 最根本的分水岭，也是构建现代大型 UVM 验证平台的理论基石。本章深入剖析**类与句柄本质、封装/继承/多态、虚方法分派机制、深浅拷贝底层原理**以及设计模式雏形 **Blueprint 蓝图模式**。

---

## 1. 概念澄清：类、对象与句柄 (Class, Object, Handle)

很多初学者容易混淆三者的物理概念：

```system-verilog
Packet pkt;          // 1. 声明句柄 (Handle)，初始值为 null，未占用对象内存
pkt = new();         // 2. 调用构造函数，在堆内存中实例化出真实的“对象 (Object)”
                     // 3. 将堆内存的首地址赋给句柄 pkt
```

<div class="compare-grid">
  <div class="compare-col">
    <div class="compare-col-title">📌 栈空间 (Stack / 作用域)</div>
    <p><strong>句柄 (Handle) <code>Packet pkt;</code></strong></p>
    <ul>
      <li>初始值为 <code>null</code>，本质是一个 32/64 位的内存地址指针</li>
      <li>在执行 <code>pkt = new()</code> 之前，并不占用实际对象字段的内存空间</li>
    </ul>
  </div>
  <div class="compare-col highlight">
    <div class="compare-col-title">📦 堆空间 (Heap Memory)</div>
    <p><strong>对象实例 (Object) <code>0x1000</code></strong></p>
    <ul>
      <li>通过 <code>new()</code> 动态开辟的物理内存实体</li>
      <li>包含 <code>addr</code>、<code>data</code>、<code>crc</code> 等所有成员变量的具体值</li>
      <li>当无任何句柄指向它时，由仿真引擎自动垃圾回收 (GC)</li>
    </ul>
  </div>
</div>

- **类 (Class)**：蓝图/模板代码，定义了数据字段与操作方法。
- **对象 (Object)**：运行期由仿真器在堆（Heap）内存中开辟的具体数据实体。
- **句柄 (Handle)**：用于索引并操作对象的指针变量。
- **垃圾回收 (Garbage Collection)**：当一个对象没有任何句柄指向它时，SystemVerilog 仿真引擎会自动将其占用的内存回收释放，无需像 C/C++ 手动 `free()`。

---

## 2. 访问控制与封装 (Encapsulation)

为了保障数据安全性，防止外部代码任意篡改内部关键状态，SV 提供了三种访问修饰符：

| 修饰符 | 本类内部访问 | 派生子类 (Subclass) 访问 | 外部类/外部代码访问 | 典型应用 |
| :--- | :---: | :---: | :---: | :--- |
| **`public` (默认)** |  |  |  | 事务数据字段、公开驱动方法 |
| **`protected`** |  |  | ❌ | 内部统计计数器、需要子类继承扩展的配置项 |
| **`local`** |  | ❌ | ❌ | 核心私有敏感变量、防外部越权调用的内部校验函数 |

```system-verilog
class Transaction;
    bit [31:0] addr;        // 默认 public，外部随意访问
    protected int id;       // protected，仅本类及子类可访问
    local bit [7:0] secret; // local，仅本类内部可访问
endclass
```

---

## 3. 继承与多态：虚方法 (Virtual Method) 的秘密

### 3.1 继承 (Inheritance)
子类通过 `extends` 关键字继承父类的属性和方法，子类的构造函数必须首先调用 `super.new()` 完成父类部分的初始化：

```system-verilog
class BasePacket;
    bit [31:0] addr;
    function new(bit [31:0] addr = 0);
        this.addr = addr;
    endfunction
    
    // 普通方法 (非虚方法)
    function void print_type();
        $display("I am BasePacket");
    endfunction
endclass

class BadPacket extends BasePacket;
    bit inject_crc_error;
    function new(bit [31:0] addr = 0, bit err = 1);
        super.new(addr); // 先初始化父类
        this.inject_crc_error = err;
    endfunction
    
    // 重写方法
    function void print_type();
        $display("I am BadPacket with CRC Error!");
    endfunction
endclass
```

### 3.2 为什么必须加 `virtual`？（面试必考）
思考以下代码的输出结果：

```system-verilog
BasePacket p_base;
BadPacket  p_bad;

initial begin
    p_bad  = new();
    p_base = p_bad; // 父类句柄指向子类对象 (向上类型转换)
    
    p_base.print_type(); // 输出什么？
end
```

- **没有加 `virtual`**：输出 `"I am BasePacket"`！  
  **机理**：编译器在编译阶段根据**句柄的静态类型（BasePacket）**绑定了父类的函数地址。
- **加了 `virtual` 关键字**：输出 `"I am BadPacket with CRC Error!"`！  
  **机理**：方法被加入虚函数表（vtable）。在运行时刻，仿真器根据**句柄当前实际指向的动态对象类型（BadPacket）**进行动态分派（Dynamic Dispatching）。
  
::: tip 黄金定律
在编写验证平台的类时，**除非有极其特殊的理由，否则所有 class 的任务（task）和函数（function）都必须声明为 `virtual`！** 否则将来基于该类扩展出的子类将无法实现行为多态覆盖。
:::

---

## 4. 对象的深拷贝 (Deep Copy) vs 浅拷贝 (Shallow Copy)

对象的复制在产生事务激励时极其高频。理解浅拷贝与深拷贝的区别是避免严重踩坑的关键：

<div class="compare-grid">
  <div class="compare-col" style="border-color:#e11d48;">
    <div class="compare-col-title" style="color:#e11d48;">⚠️ 浅拷贝 (p2 = new p1;) 隐患</div>
    <ul>
      <li>基本整数类型被直接复制，<strong>但内部嵌套的对象句柄只复制指针地址</strong></li>
      <li><code>p1</code> 与 <code>p2</code> 共享同一个底层子对象</li>
      <li>一旦修改 <code>p2.sub_obj</code>，<code>p1</code> 内部的数据也会被意外篡改！</li>
    </ul>
  </div>
  <div class="compare-col highlight" style="border-color:#10b981;">
    <div class="compare-col-title" style="color:#10b981;">✅ 深拷贝 (自定义 copy) 彻底隔离</div>
    <ul>
      <li>递归调用嵌套子对象的 <code>copy()</code> 方法分配全新独立实例</li>
      <li><code>p1</code> 与 <code>p2</code> 及其子成员在堆内存中完全独立解耦</li>
      <li>后续对任意副本的随机化和属性修改绝不产生副作用</li>
    </ul>
  </div>
</div>

### 4.1 浅拷贝的局限性
使用 SV 原生语法 `p2 = new p1;`：
- 它会把 `p1` 内部的基本数据类型（`bit, int` 等）完整复制给 `p2`；
- 但是如果 `p1` 内部还包含另一个对象句柄（例如 `Header header_obj`），**浅拷贝仅复制句柄指针地址，导致 `p1` 和 `p2` 指向同一个底层子对象！**
- 一旦后续代码修改了 `p2.header_obj.length`，`p1` 里的数据也会被意外篡改！

### 4.2 工业级深拷贝的标准实现模版
为了实现真正彻底的克隆，标准做法是在类内部编写 `copy()` 方法递归深挖：

```system-verilog
class Header;
    bit [7:0] len;
    virtual function Header copy();
        copy = new();
        copy.len = this.len;
    endfunction
endclass

class Transaction;
    bit [31:0] data;
    Header     hdr; // 嵌套对象

    function new();
        hdr = new();
    endfunction

    // 标准深拷贝函数
    virtual function Transaction copy();
        copy = new();
        copy.data = this.data;
        // 关键点：递归调用子对象的 copy() 创建全新独立实例！
        copy.hdr  = this.hdr.copy(); 
    endfunction
endclass
```

---

## 5. Blueprint 蓝图模式：UVM Factory 的原型哲学

在大型验证平台中，Generator 负责产生大量数据包并发给 Driver。如果在 Generator 内部硬编码 `pkt = new();`，那么当我们需要测试注入坏包 `BadPacket` 时，就不得不进入 Generator 修改其内部源码。

**蓝图模式（Blueprint Pattern）通过“预留原型对象句柄”解决了这一解耦难题**：

```system-verilog
class Generator;
    // blueprint 句柄：作为制造新对象的模具原型
    Transaction blueprint;
    mailbox     gen2drv;

    function new(mailbox gen2drv);
        this.gen2drv = gen2drv;
        this.blueprint = new(); // 默认是正常基础包
    endfunction

    task run();
        Transaction tr;
        repeat (10) begin
            // 关键：不直接 new 具体类，而是通过蓝图的 copy 克隆！
            tr = blueprint.copy();
            assert(tr.randomize());
            gen2drv.put(tr);
        end
    endtask
endclass
```

### 测试层灵活替换蓝图
```system-verilog
initial begin
    Generator gen = new(mbx);
    BadPacket bad = new(); // 准备注入错误的派生类
    
    // 动态将生成器的原型替换为 BadPacket
    // 后续 Generator 就会源源不断克隆生成 BadPacket，完全无需修改 Generator 代码！
    gen.blueprint = bad;
    gen.run();
end
```

> **设计启示**：这种“不修改已编译代码、仅通过外部配置替换生产类型”的设计理念，正是后续 **UVM Factory 工厂重载机制 (`set_type_override`) 的前身与灵魂**！

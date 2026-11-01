# 07. 功能覆盖率 (Functional Coverage) 深度解析

在受约束的随机验证（CRV）中，仿真器像机关枪一样打出了数以亿计的随机数据包。但**如何量化证明设计规格书（Spec）中的所有功能和边界情况都已经被彻底测到了？** 这就是覆盖率驱动验证（Coverage-Driven Verification, CDV）的核心使命。

---

## 1. 覆盖率分类金字塔：代码覆盖率 vs 功能覆盖率

在芯片项目中，覆盖率主要分为以下维度：

<div class="compare-grid">
  <div class="compare-col">
    <div class="compare-col-title">📊 代码覆盖率 (Code Coverage - 工具自动提取)</div>
    <ul>
      <li><strong>行覆盖率 (Line / Statement)</strong>：每行 RTL 代码是否被执行过</li>
      <li><strong>分支覆盖率 (Branch / Decision)</strong>：<code>if/else</code>、<code>case</code> 各分支走向</li>
      <li><strong>条件覆盖率 (Condition)</strong>：复杂布尔表达式各变量的真假组合</li>
      <li><strong>翻转覆盖率 (Toggle)</strong>：各寄存器/线网是否完整发生 <code>0-&gt;1</code> 与 <code>1-&gt;0</code> 跳变</li>
      <li><strong>状态机覆盖率 (FSM)</strong>：状态是否全遍历，所有状态转移弧线是否触发</li>
    </ul>
  </div>
  <div class="compare-col highlight">
    <div class="compare-col-title">🎯 功能覆盖率 (Functional Coverage - 人工编写闭环)</div>
    <ul>
      <li><strong>协议特性覆盖</strong>：是否覆盖了突发传输 (Burst)、错误响应包？</li>
      <li><strong>极端边界覆盖</strong>：FIFO 满水位下立即发起背对背写入？</li>
      <li><strong>多参数笛卡尔积 (Cross)</strong>：高低波特率与不同奇偶校验位的交叉组合？</li>
      <li><strong>面向设计意图 (Spec)</strong>：客观度量硬件是否真正实现了规格书全部功能</li>
    </ul>
  </div>
</div>

::: tip 面试必考辩析：代码覆盖率 100% 就代表芯片没 Bug 吗？
**绝对不是！**
- **代码覆盖率**衡量的只是“已写出的 RTL 代码有没有被执行过”，它**无法发现设计遗漏（Missing Logic）**。如果 Spec 要求支持 64 字节包，但 RTL 设计师根本忘了写这段逻辑，代码覆盖率依然可以达到 100%！
- **功能覆盖率**是以设计规格书（Spec）为基准编写的。只有功能覆盖率达到 100%，才能客观证明芯片设计忠实实现了 Spec 规定的全部功能需求。
:::

---

## 2. Covergroup 与采样触发机制

SystemVerilog 使用 `covergroup` 封装覆盖率模型：

```system-verilog
class BusMonitor;
    Transaction tr;
    
    // 声明覆盖组
    covergroup cov_bus;
        // 采样点 1：覆盖地址空间
        cp_addr: coverpoint tr.addr;
        // 采样点 2：覆盖命令类型
        cp_cmd:  coverpoint tr.cmd;
    endgroup

    function new();
        cov_bus = new(); // 实例化覆盖组
    endfunction

    // 在监视器每次捕获完整数据包时，显式调用 sample() 采样
    task run();
        forever begin
            vif.collect_packet(tr);
            cov_bus.sample(); // 显式事件采样
        end
    endtask
endclass
```

也可以将采样绑定到硬件时钟或事件上：
```system-verilog
covergroup cov_clk @(posedge vif.clk);
    coverpoint vif.ready;
endgroup
```

---

## 3. Coverpoint 与仓 (Bins) 的精细化划分

如果不对 `coverpoint` 进行仓划分，仿真器会默认自动创建若干均分仓（`auto_bin_max`，默认通常为 64）。为了贴合 Spec，必须手动定义 `bins`：

### 3.1 仓的五大核心形态

```system-verilog
covergroup cov_packet;
    coverpoint tr.len {
        // 1. 单值仓 (Single value)
        bins len_zero = { 0 };
        
        // 2. 离散与范围仓 (Set & Range)
        bins len_small = { 1, 2, 4 };
        bins len_mid   = { [5 : 128] };
        
        // 3. 自动切分仓 [N] (将区间等分为 4 个子仓)
        bins len_large[4] = { [129 : 1024] };

        // 4. 忽略仓 (ignore_bins)：在统计覆盖率时不计入分母
        ignore_bins len_ignored = { [1025 : $] };

        // 5. 非法仓 (illegal_bins)：一旦采到该值，仿真器立即报错报错中断！
        illegal_bins len_invalid = { 32'hFFFF_FFFF };
    }
endgroup
```

### 3.2 状态转移仓 (Transition Bins)
用于检查状态机、信号翻转顺序是否覆盖特定序列：

```system-verilog
coverpoint tr.fsm_state {
    // 覆盖从 IDLE 转移到 SETUP，再转移到 ACCESS 的连续时钟序列
    bins b_trans_normal = (IDLE => SETUP => ACCESS);
    
    // 覆盖连续 3 次保持在 WAIT 状态: (WAIT [* 3])
    bins b_wait_repeat  = (WAIT [* 3]);
}
```

---

## 4. 交叉覆盖率 (Cross Coverage) 与条件过滤

当两个或多个变量的不同取值**发生笛卡尔积交叉**时，往往是最容易暴露 Bug 的盲区（例如：在低功耗模式下进行高速突发写）：

```system-verilog
covergroup cov_fifo;
    cp_op: coverpoint tr.op {
        bins read  = { 0 };
        bins write = { 1 };
    }

    cp_status: coverpoint tr.fifo_level {
        bins empty = { 0 };
        bins mid   = { [1 : 15] };
        bins full  = { 16 };
    }

    // 交叉覆盖率：2 个 op 状态与 3 个 status 状态，形成 2 * 3 = 6 个交叉仓
    cross_op_status: cross cp_op, cp_status {
        // 剔除无意义的交叉组合：FIFO 已经为 empty 时不可能发起合法的读
        ignore_bins ignore_read_empty = binsof(cp_op.read) && binsof(cp_status.empty);
    }
endgroup
```

- **`binsof()` 与 `intersect`**：用于精准匹配交叉仓的子集，剔除物理上不可能存在的伪场景，防止分母虚高导致覆盖率永远无法达到 $100\%$。

---

## 5. 覆盖率配置选项 (Options)

```system-verilog
covergroup cov_demo;
    // 关键配置 1：开启按实例统计
    // 默认情况下多个实例的覆盖率会被合并展示；
    // 设置为 1 后，每个实例单独展示覆盖率曲线，便于排查某个特定通道漏测
    option.per_instance = 1;

    // 关键配置 2：每个仓至少被命中多少次才算 100% 覆盖（提高测试严谨度）
    option.at_least = 5;

    // 关键配置 3：本组追求的目标覆盖率百分比
    option.goal = 100;

    coverpoint tr.data;
endgroup
```

---

## 6. 覆盖率驱动闭环流程 (Coverage-Driven Sign-off)

<div class="flow-steps">
  <div class="flow-step-box">1. Regression 海量用例批量仿真</div>
  <span class="flow-arrow">➔</span>
  <div class="flow-step-box">2. EDA 工具合并覆盖率库<br><small style="color:var(--vp-c-text-2);">VCS urg / Verdi Coverage</small></div>
  <span class="flow-arrow">➔</span>
  <div class="flow-step-box">3. 分析未覆盖空洞 (Holes)<br><small style="color:var(--vp-c-text-2);">分析约束死角或 Spec 变更</small></div>
  <span class="flow-arrow">➔</span>
  <div class="flow-step-box">4. 针对性调整权重 / 补充定向用例</div>
  <span class="flow-arrow">➔</span>
  <div class="flow-step-box" style="border-color:var(--vp-c-brand-1); background:var(--vp-c-brand-soft);">🏁 5. 双 100% 收敛流片 (Sign-off)</div>
</div>
1. 跑完海量 Regression 后，使用工具（如 VCS 的 `urg` 工具）合并 `.vdb` 覆盖率数据库生成 HTML 报表；
2. 报表会精准标红未命中的覆盖率空洞（Holes）；
3. 验证工程师分析空洞成因：
   - 如果是约束太严把合法值滤掉了 $\rightarrow$ 放宽/微调 `constraint`；
   - 如果是该场景概率极低（如百万分之一） $\rightarrow$ 编写定向用例或加大权重 `dist`；
   - 如果是设计规范变更导致该场景已废弃 $\rightarrow$ 将其加入 `ignore_bins`。
4. 循环迭代直到代码覆盖率与功能覆盖率双双收敛。

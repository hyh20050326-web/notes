---
layout: home

hero:
  name: "数字 IC 学习笔记"
  text: "从 FPGA 底层架构到 RISC-V 芯片设计"
  tagline: "FPGA 核心讲义 · HDLBits 刷题 · “一生一芯”手搓 CPU · 数字 IC 面试八股 · SV/UVM 数字验证"
  image:
    src: /logo.svg
    alt: 数字 IC 知识库 Logo
  actions:
    - theme: brand
      text: 📐 FPGA 核心讲义
      link: /fpga/01-basic-architecture
    - theme: alt
      text: 🎯 HDL Bits 刷题
      link: /hdlbits/
    - theme: alt
      text: 🚀 一生一芯实战
      link: /ysyx/
    - theme: alt
      text: 📚 基础八股精选
      link: /ic-interview/
    - theme: alt
      text: 🔬 数字验证实战
      link: /verification/

features:
  - icon: 📐
    title: FPGA 核心复习讲义
    details: 深入剖析 CLB (LUT/FF/进位链)、Block RAM 与 Distributed RAM、DSP48 硬核、IOB 接口及全局时钟网络 (BUFG/MMCM)。
  - icon: 🧩
    title: HDL Bits 刷题笔记
    details: 系统整理 Verilog 组合逻辑、时序电路、移位寄存器与状态机 FSM 的解题技巧与踩坑记录。
  - icon: ⚡
    title: “一生一芯” 学习全流程
    details: 记录从预学习、Verilator 仿真、NEMU 模拟器 PA 实验到 NPC 硬件手搓 RISC-V 处理器的完整旅程。
  - icon: 🎯
    title: 数字 IC 核心基础八股
    details: 提炼静态时序分析 STA、跨时钟域 CDC、亚稳态、异步 FIFO 以及低功耗设计的高频面试硬核干货。
  - icon: 🔬
    title: 数字验证 (SV & UVM) 实战
    details: 紧扣绿皮书与工程网课，系统梳理 SystemVerilog 语言核心、分层测试平台、CRV 约束随机、功能覆盖率、UVM Phase 与 MCDF 平台搭建。
---
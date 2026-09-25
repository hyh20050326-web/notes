# Python 高效编程与工程实践

记录日常开发中优雅、高效且符合 Pythonic 风格的代码写法与工程经验。

---

## 1. 列表推导与生成器表达式

当处理大规模数据流时，优先使用生成器表达式以节约内存开销：

```python
# 普通列表推导式：立即占用内存生成完整列表
squares_list = [x ** 2 for x in range(1000000)]

# 生成器表达式：惰性求值，按需产出
squares_gen = (x ** 2 for x in range(1000000))
print(next(squares_gen)) # 0
print(next(squares_gen)) # 1
```

---

## 2. 上下文管理器 (Context Manager)

使用 `with` 语句安全管理资源释放（如文件锁、网络会话、数据库连接）：

```python
from contextlib import contextmanager
import time

@contextmanager
def timer(label: str):
    start = time.perf_counter()
    try:
        yield
    finally:
        elapsed = time.perf_counter() - start
        print(f"[{label}] 执行耗时: {elapsed:.4f} 秒")

# 使用示例
with timer("大数据运算"):
    sum(i * i for i in range(1000000))
```

# 算法与数据结构学习路线

> “算法是程序的灵魂，数据结构是算法的骨架。”

---

## 核心知识框架

1. **基础线性结构**：数组、链表、栈、队列、双端队列、哈希表。
2. **树形结构与图论**：二叉树、红黑树、线段树、并查集、拓扑排序、Dijkstra 最短路径。
3. **高频解题思想**：
   - 双指针与滑动窗口
   - 二分查找与分治
   - 动态规划（背包问题、区间 DP、状态压缩）
   - 回溯与深度优先搜索（DFS）

---

## 经典算法模板：二分查找

```python
def binary_search(nums: list[int], target: int) -> int:
    """标准左闭右闭区间二分查找"""
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1
```

# Round 5 第四轮缺陷清单与第三轮缺陷状态更新

> 日期：2026-04-22  
> 线程：QA & Release Worker  
> 任务卡 ID：`R5-R4-D`

## 1. 第三轮缺陷状态更新

| ID | 优先级 | 第四轮状态 | 说明 | owner | 下一步 |
|----|--------|------------|------|-------|--------|
| `R5-R3-D-DEF-01` | `P1` | 已解决 | fresh runtime 新建外呼与 webhook 回放后，`call_events.session_direction`、`target_endpoint_id`、`trace_id` 已能在 accepted / callback / completed / recording 事件中真实落库，第三轮 accepted 字段 gap 不再成立。 | B | 无；后续只需继续防止字段回退。 |
| `R5-R3-D-DEF-02` | `P2` | 仍有效 | `direct_prefix_mode` 仍缺单一 fresh runtime 下的真机或模拟器证据；第四轮已明确当前 QA 主机只有 `Windows / Chrome / Edge`，`flutter emulators` 为空，`adb` 不可用，`flutter doctor -v` 还提示 Android SDK 版本不足。 | B, 主线程 | 提供 Android / iOS 真机或模拟器，补齐 SDK / `adb` 环境后，重跑 `INT-06`、`INT-10`、`SMK-08`、`REG-03`。 |
| `R5-R3-D-DEF-03` | `P2` | 已解决 | 第四轮已在 single fresh runtime 上真实回放 inbound callback 命中、过期、错 DID、错号码，以及 outbound completed / recording ready；第三轮“未重放真实 inbound webhook”不再成立。 | B, C | 无；后续继续用 cookbook 和 fixture 复用当前路径。 |

## 2. 第四轮仍有效缺陷 / 阻塞

| ID | 优先级 | 状态 | 问题 | 证据 | owner | 下一步 |
|----|--------|------|------|------|-------|--------|
| `R5-R3-D-DEF-02` | `P2` | 仍有效 | 当前 QA 机器不具备移动端运行面，无法给出 `direct_prefix_mode` 真机或模拟器兼容拨号证据。 | `flutter devices` 只发现 `Windows / Chrome / Edge`；`flutter emulators` 返回无 emulator source；`adb devices` 提示命令不存在；`flutter doctor -v` 显示 Android SDK 35 而非 36。 | B, 主线程 | 准备一台 Android / iOS 真机或可启动模拟器，再由 D 线程补跑 `direct_prefix_mode` 证据。 |

## 3. 第四轮不记为缺陷但需显式说明的事实

- `shared_switcher` 通过标准登录与 `X-Tenant-Id` 已完成双租户切换和隔离验证；beta 正向 DID / endpoint 选择由 `beta_owner` 样本完成，本轮不把这种 seed 分工当成新的业务缺陷。
- fixture 回放通过只说明当前 webhook 消费面闭环成立，不对真实 trunk / callback 商用稳定性做超出口径承诺。

## 4. 当前 owner 视图

### B 线程

- `R5-R3-D-DEF-02`

### 主线程

- `R5-R3-D-DEF-02`

## 5. 第四轮状态汇总

- 第三轮遗留缺陷：`已解决 2`、`仍有效 1`、`已过时 0`
- 第四轮新增业务缺陷：`0`
- 第四轮遗留阻塞：`1 个 P2 环境阻塞`
- 当前结论：`无 P0 / P1；存在 1 个需主线程确认是否接受的 P2`

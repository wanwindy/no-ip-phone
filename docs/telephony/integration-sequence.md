# 最小对接顺序说明

> 目标：给 trunk / FreeSWITCH / Kamailio 实现线程一个可直接照表执行的最小落地顺序，避免并行实现时各自补猜。

## 1. 实现前置

开始真实互联前，三个实现线程必须先共享以下冻结资产：

1. `telephony-contract.md`
2. `state-dictionaries.md`
3. `callback-same-number-rules.md`
4. `header-and-channel-mapping.md`

若其中任一文档被跳过，不允许先写真实互联代码。

## 2. 最小实现顺序

### Step 1：先接统一常量

三个实现面先统一以下常量：

- webhook 路径：`/webhooks/inbound-call`、`/webhooks/call-status`、`/webhooks/recording-ready`
- 鉴权头：`X-Telephony-Key-Id`、`X-Telephony-Timestamp`、`X-Telephony-Nonce`、`X-Telephony-Signature-Version`、`X-Telephony-Signature`
- SIP header 前缀：`X-NIP-`
- FreeSWITCH channel variable 前缀：`nip_`

完成标准：

- trunk adapter、Kamailio/OpenSIPS、FreeSWITCH 使用同一份常量名
- 不再新增第二套 header 名或签名字段名

### Step 2：实现入呼 webhook 决策

Kamailio/OpenSIPS 或 inbound adapter 先完成：

1. 从入呼 SIP 提取并归一化 `display_did`、`remote_number`
2. 按 `telephony-contract.md` 组装 `POST /webhooks/inbound-call`
3. 带上统一鉴权头并验签
4. 只处理两类响应：`route_callback` 或 `reject`

完成标准：

- 未命中回拨时能稳定返回 `reject`
- 命中回拨时能拿到 `call_session_ref`、`callback_session_ref`、`target_endpoint_ref`

### Step 3：实现命中后的变量回灌

当 `/webhooks/inbound-call` 返回 `route_callback` 后：

1. SIP Router 把响应中的逻辑键写成 `X-NIP-*`
2. 转交 FreeSWITCH 时把同样的值写成 `nip_*`
3. FreeSWITCH 后续所有状态回流都从 `nip_*` 读取，不重新猜值

完成标准：

- `call_session_ref`
- `callback_session_ref`
- `target_endpoint_ref`
- `session_direction=inbound`

以上四个值在 media 链路内可稳定取回。

### Step 4：实现回拨生命周期状态回流

FreeSWITCH / media adapter 接着实现 `POST /webhooks/call-status` 的回拨事件序列：

1. `telephony.callback.target.ringing`
2. `telephony.callback.target.answered`
3. `telephony.callback.bridged`
4. `telephony.callback.completed` / `telephony.callback.failed` / `telephony.callback.canceled`

完成标准：

- 不跳过 `bridged`
- 不把 `target.answered` 直接当作 `bridged`
- 终态不回滚

### Step 5：实现出呼状态回流

在入呼回拨闭环跑通后，再接出呼状态：

1. `telephony.outbound.accepted`
2. `telephony.outbound.ringing`
3. `telephony.outbound.answered`
4. `telephony.outbound.bridged`
5. `telephony.outbound.completed` / `telephony.outbound.failed` / `telephony.outbound.canceled`

完成标准：

- 出呼和入呼回拨共用同一个 `/webhooks/call-status`
- 两类流程都必须带 `session_direction`

### Step 6：最后接录音回流

最后才接 `POST /webhooks/recording-ready`：

1. `telephony.recording.ready`
2. `telephony.recording.failed`

完成标准：

- 录音回流复用同一套鉴权头和签名规则
- `recording_id`、`call_session_ref`、`session_direction` 可稳定带回

## 3. 入呼同号回拨的最小 happy path

1. 中国被叫回拨展示 DID。
2. trunk 把入呼送到 SIP Router。
3. SIP Router 归一化号码后调用 `POST /webhooks/inbound-call`。
4. Orchestrator 写入 `telephony.inbound.received`，命中后再写 `telephony.callback.matched`。
5. 响应返回 `route_callback + call_session_ref + callback_session_ref + target_endpoint_ref`。
6. SIP Router 把上述逻辑键写成 `X-NIP-*`，并传给 FreeSWITCH。
7. FreeSWITCH 给目标终端振铃，并回流 `telephony.callback.target.ringing`。
8. 目标终端接听后，回流 `telephony.callback.target.answered`。
9. 双方桥接成功后，回流 `telephony.callback.bridged`。
10. 通话结束后，回流 `telephony.callback.completed`；若失败或取消，则回流对应终态事件。

## 4. 实现线程禁止事项

- 不允许跳过 `/webhooks/inbound-call` 直接在 Router 本地匹配 callback
- 不允许在未统一 `X-NIP-*` / `nip_*` 映射前先写 FreeSWITCH 脚本
- 不允许新增第二套 webhook 鉴权头或签名算法
- 不允许把 `direct_prefix_mode` 的客户端旧链路混入 telephony 主契约

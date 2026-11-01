# 甲状腺术后康复指导原型

安徽医科大学第一附属医院甲状腺外科

公开入口：https://zhouzhensen.github.io/thyroid-rehab/

## 功能与边界

供医护评审和流程体验，未经临床验证。支持训练前筛查、动作指导、本地视频回放、自查反馈、异常提醒及下载反馈单。

0.2 版加入可选的人体关键点辅助筛查：仅针对轻柔低头、左右转头、左右侧屈视频中的躯干和肩线投影变化提供回放时间点与固定提示。不判断头颈目标动作是否合格，不测临床颈椎活动度，不指导用药、吞咽或训练进阶。低可见度、多人入镜、参考姿势不稳定等情况返回无法判断。

模型为 MediaPipe Tasks Vision 1.2.0 与 Pose Landmarker Lite revision 1。模型在浏览器设备上运行，视频和健康输入不上传；模型运行文件从本站下载。工程阈值未经临床验证，不是指南角度标准。没有护士在线审核。

## 临床与技术依据

- Huang et al. 2026，甲状腺术后联合康复随机试验：https://pubmed.ncbi.nlm.nih.gov/41778443/ 。支持临床康复背景，不验证本站算法。
- CUH 术后颈肩活动患者教育：https://www.cuh.nhs.uk/patient-information/neck-and-shoulder-exercises/ 。一般术后背景，不直接套用其剂量。
- 技术说明：https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js 。关键点技术能力不等于临床有效性。

首次使用约下载34MB资源。视频需6～45秒，前2秒正面中立坐位，固定机位并包含头部、双肩及腰部。使用前须获得医护活动许可。无提示不等于动作安全或合格。

第三方许可见 THIRD_PARTY_NOTICES.md 和 MEDIAPIPE-LICENSE.txt。模型资源由 GitHub Actions 从官方固定地址下载，按 scripts/model-hashes.json 校验。站点不含患者数据、账号凭据或原始研究资料。

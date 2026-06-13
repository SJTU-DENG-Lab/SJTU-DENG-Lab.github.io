+++
title = "Multi-Block Diffusion Language Models"
date = 2026-06-11
authors = ["Yijie Jin", "Jiajun Xu", "Yuxuan Liu", "Chenkai Xu", "Yi Tu", "Jiajun Li", "Dandan Tu", "Xiaohui Ye", "Kai Yu", "Pengfei Liu", "Zhijie Deng†"]
author = "Yijie Jin, Jiajun Xu, Yuxuan Liu, Chenkai Xu, Yi Tu, Jiajun Li, Dandan Tu, Xiaohui Ye, Kai Yu, Pengfei Liu, Zhijie Deng†"
ShowReadingTime = true
draft = false
summary = "We introduce Multi-Block Diffusion Language Models (MBD-LMs), which align BD-LMs with practical MultiBD inference through Multi-block Teacher Forcing and an optimized Block Buffer decoding engine."
[cover]
      image = "blogs/mbd/image/cover.png"
      alt = "SingleBD versus MultiBD"
      caption = "SingleBD processes blocks sequentially, while MultiBD overlaps future-block refinement with KV-cache storing."
+++

{{< socialBadges code="https://github.com/SJTU-DENG-Lab/MultiBD" >}}

## TL; DR

{{< justify >}}
Block Diffusion Language Models (BD-LMs) make diffusion-based text generation more practical by supporting KV caching and flexible-length generation. However, native BD-LMs usually perform **Single-Block Diffusion (SingleBD)**: each forward pass refines one noisy block conditioned on a clean cached prefix. This preserves the serving benefits of BD-LMs, but blocks are still processed sequentially.

We propose **Multi-Block Diffusion Language Models (MBD-LMs)**, a formulation and post-training recipe for reliable **Multi-Block Diffusion (MultiBD)**. The key idea is to decode a bounded running-set of consecutive blocks concurrently, while training the model on states that resemble this practical inference regime. MBD-LMs are obtained by **Multi-block Teacher Forcing (MultiTF)** and served with an optimized **Block Buffer** inference engine.

Empirically, **MBD-LLaDA2-Mini** increases average Tokens Per Forward pass (TPF) from **3.47 to 6.19** and improves average accuracy from **79.95% to 81.03%**. When combined with DMax, **MBD-LLaDA2-Mini-DMax** reaches an average TPF of **9.34** with only a **1.02 percentage-point** average accuracy drop on math and code benchmarks.
{{< /justify >}}

{{< image src="image/fig1_singlebd_vs_multibd.png" alt="SingleBD versus MultiBD" width="95%" title="Figure 1. SingleBD decodes blocks sequentially and creates KV-cache storing bubbles. MultiBD overlaps future-block refinement with KV-cache storing of completed blocks, enabling inter-block parallelism.">}}

## From SingleBD to MultiBD

{{< justify >}}
Diffusion Language Models (DLMs) generate text through iterative denoising and naturally support parallel token refinement. Fully bidirectional DLMs, however, are difficult to serve efficiently because they do not naturally support KV caching or dynamic-length generation. BD-LMs address this issue by generating text in block-causal form: completed blocks become a clean cached prefix, and the current block is denoised under block-causal attention.

This design gives native BD-LMs efficient **intra-block** parallelism, but not **inter-block** parallelism. In SingleBD, a later block cannot begin refinement until the current block has finished decoding and has been committed to the KV cache. The result is a storing bubble: during cache storing, no new token is generated and no decode-store overlap is exploited.

MultiBD removes this bottleneck by maintaining a small running-set of consecutive blocks. Earlier blocks in the running-set may be completed and waiting to enter the cache, while later blocks can already be active noisy blocks. This enables the model to refine future blocks while completed blocks are being committed to the KV cache.
{{< /justify >}}

## Why Training-Free MultiBD Is Not Enough

{{< justify >}}
A natural question is whether existing BD-LMs can simply run MultiBD at inference time. The paper shows that this is only partially effective. Direct MultiBD inference increases TPF, confirming that multi-block decoding relaxes the single-block bottleneck, but it can degrade accuracy because the model was not trained on practical MultiBD states.

The mismatch has two components. First, practical MultiBD does not decode an unbounded noisy suffix. It uses a **bounded running-set**, often with an active part around two blocks and occasional expansion to three or four active blocks. Second, active slots can have **heterogeneous mask-ratio patterns**: adjacent slots may differ substantially in noise level. Reliable MultiBD therefore requires training states that match both the bounded running-set structure and the slot-wise noise patterns observed during inference.
{{< /justify >}}

{{< image src="image/fig2_alignment_stats.png" alt="Train-inference statistics for MultiBD" width="95%" title="Figure 2. Train-inference statistics for MultiBD. D2F-style schedules, chain-uniform MultiTF schedules, inference-time mask ratios, and active-block trajectories reveal the bounded and heterogeneous nature of practical MultiBD inference.">}}

## MBD-LMs: A Running-Set View of BD-LMs

{{< justify >}}
MBD-LMs formulate BD-LM generation around a **running-set** of consecutive blocks. At decoding step $s$, the running-set contains the blocks that have not yet entered the prefix KV cache. It includes active noisy blocks and completed preceding blocks waiting to be cached. Blocks before the running-set form the clean cached prefix.

This view unifies several regimes. Teacher-Forcing-trained BD-LMs correspond to the SingleBD extreme, where the model observes one noisy block conditioned on a clean cached prefix. D2F introduces visibility among multiple noisy blocks, but its training states still differ from practical MultiBD in running-set size and slot-wise noise patterns. Practical MultiBD is the bounded intermediate regime: the running-set should be larger than one to expose inter-block parallelism, but small enough to keep each forward pass efficient.
{{< /justify >}}

{{< image src="image/fig3_train_inference_paradigms.png" alt="Train-inference alignment across paradigms" width="70%" title="Figure 3. TF and D2F provide existing BD-LM training states, but neither directly matches practical MultiBD. MultiTF builds inference-like noise-groups with heterogeneous slot-wise noise patterns.">}}

## MultiTF: Post-Training BD-LMs for MultiBD

{{< justify >}}
**Multi-block Teacher Forcing (MultiTF)** turns BD-LMs into MBD-LMs by constructing training states that resemble practical MultiBD inference. Instead of corrupting only one block as in standard teacher forcing, MultiTF corrupts a bounded group of consecutive blocks, called a **noise-group**, while conditioning later groups on clean earlier groups.

MultiTF has three main ingredients:

1. **Noise-group layouts.** Systematic layouts enumerate group sizes and shifts so that blocks appear at different group-relative positions. Random layouts add non-regular group-size combinations and boundary patterns.
2. **Chain-uniform noise-scheduling.** Within each noise-group, mask ratios are sampled monotonically but randomly, producing larger and more diverse slot-wise noise gaps than a fixed D2F-style monotonic schedule.
3. **Group-Aware Dual-Stream Mask.** Noisy blocks inside the same noise-group can attend to each other under block-causal visibility, each noise-group can condition on its clean prefix, and clean tokens are prevented from attending to noisy tokens.

The resulting inputs are used for masked-token cross-entropy, and model-specific objectives such as DMax OPUT can be applied on top of the same MultiTF input construction.
{{< /justify >}}

{{< image src="image/fig4_multitf_overview.png" alt="Overview of MultiTF" width="95%" title="Figure 4. MultiTF constructs systematic and random noise-group layouts, applies a Group-Aware Dual-Stream Mask, and post-trains BD-LMs into MBD-LMs.">}}

## Optimized MultiBD with Block Buffer

{{< justify >}}
MultiBD is useful only if the additional parallelism can be translated into wall-clock speedup. A naive implementation directly materializes the current running-set as the physical input to each forward pass. This exposes inter-block parallelism, but the number of processed tokens changes over time and across requests, making CUDA Graph capture and replay difficult.

To make MultiBD practically executable, the paper introduces the **Block Buffer** mechanism. A Block Buffer contains a fixed number of physical block slots. Real resident blocks inside the buffer form the logical running-set, while trailing dummy slots reserve capacity for future blocks. A future block enters decoding by activating an existing dummy slot instead of extending the physical input sequence. When the front block is completed, it is committed to the KV cache and the buffer slides forward by appending a new dummy slot at the tail.

Each slot follows the state transition **dummy -> active -> to-cache -> in-cache**. This design preserves prefix-cache reuse, keeps input shapes static, overlaps decoding with KV-cache storing, and supports CUDA Graph replay.
{{< /justify >}}

{{< image src="image/fig5_block_buffer.png" alt="Block Buffer inference pipeline" width="95%" title="Figure 5. MultiBD inference with Block Buffer. A fixed block-buffer hierarchy enables parallel block refinement while preserving prefix-cache semantics and static-shape execution.">}}

## Main Results

{{< justify >}}
The experiments evaluate mathematical reasoning on GSM8K and MATH500, and code generation on MBPP+ and HumanEval+. The paper reports Accuracy, Tokens Per Forward pass (TPF), and Accuracy Under Parallelism (AUP), where TPF measures decoding parallelism and AUP summarizes the accuracy-parallelism trade-off.

The main trend is consistent across models: MBD-LMs substantially improve TPF over native SingleBD, and MultiTF often recovers or improves the quality lost by training-free MultiBD. On LLaDA2-Mini, MultiTF raises average accuracy from **78.59%** under training-free MultiBD to **81.03%**, while further increasing average TPF from **4.41** to **6.19**. On SDAR-8B-Chat-b32, MBD-SDAR-8B-Chat-b32 increases average TPF from **2.54** to **4.46** and improves average accuracy from **69.00%** to **69.74%**.
{{< /justify >}}

{{< image src="image/table1_main_results.png" alt="Main evaluation results" width="95%" title="Table 1. Evaluation results across math and code benchmarks. MBD-LMs consistently improve TPF over SingleBD and improve the accuracy-parallelism trade-off in most settings.">}}

{{< justify >}}
Ablations further support the training-state alignment story. Combining systematic and random layouts gives the best AUP among the layout variants. Replacing the chain-uniform scheduler with other schedulers reduces the accuracy-parallelism trade-off; in particular, the D2F-style monotonic scheduler causes a large accuracy drop in the reported ablation, indicating that noisy-block visibility alone is not sufficient when slot-wise noise patterns are mismatched.
{{< /justify >}}

{{< image src="image/table2_transfer_ablation.png" alt="Transfer and ablation results" width="95%" title="Table 2. Training-free MultiBD transfers to additional model variants, while MultiTF component ablations show the role of layout construction and chain-uniform scheduling.">}}

## Throughput: From TPF to TPS

{{< justify >}}
Higher TPF does not automatically imply proportional wall-clock speedup because MultiBD processes a larger static Block Buffer at each forward pass. The paper therefore separates useful committed tokens from the per-step computational workload. Increasing the buffer size can improve throughput when the useful-token gain outweighs the extra per-step cost introduced by resident blocks and dummy slots.

On the H100 TP=2 setup reported in Table 3, MBD-LLaDA2-Mini increases average TPF from **3.47** to **6.19** while step latency rises from **7.07 ms** to **8.78 ms**. The measured average TPS increases from **517.16** to **745.92**. With DMax, MBD-LLaDA2-Mini-DMax increases average TPF from **6.35** to **9.34**, and average TPS rises from **779.49** to **926.67** in the same table.
{{< /justify >}}

{{< image src="image/table3_throughput.png" alt="Throughput and latency results" width="95%" title="Table 3. Throughput and single-step latency comparison on two H100 GPUs with TP=2. MultiBD improves realized TPS despite increasing per-step latency.">}}

## Conclusion

{{< justify >}}
MBD-LMs show that reliable MultiBD requires both training-time state alignment and inference-time system support. MultiTF aligns BD-LMs with bounded running-set states and heterogeneous slot-wise noise patterns, while Block Buffer makes MultiBD compatible with prefix-cache reuse and static-shape execution. Together, they turn increased decoding parallelism into practical throughput gains while maintaining generation quality on math and code benchmarks.
{{< /justify >}}

## Citation

The official BibTeX entry will be added after the paper is publicly released.

## Reference

[1] Marianne Arriola et al. Block Diffusion: Interpolating Between Autoregressive and Diffusion Language Models. ICLR, 2025.

[2] Tiwei Bie et al. LLaDA2.0: Scaling Up Diffusion Language Models to 100B. arXiv preprint, 2025.

[3] Xu Wang et al. Diffusion LLMs Can Do Faster-than-AR Inference via Discrete Diffusion Forcing. arXiv preprint, 2025.

[4] Zigeng Chen et al. DMax: Aggressive Parallel Decoding for dLLMs. arXiv preprint, 2026.

[5] Shuang Cheng et al. SDAR: A Synergistic Diffusion-Autoregression Paradigm for Scalable Sequence Generation. arXiv preprint, 2025.

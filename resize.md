一句话架构概览

前端（React）：上传 PSD → 显示各图层缩略图 → 选择要缩放的图层并输入缩放比例 → 发请求到后端。

后端（FastAPI）：

解析 PSD（psd-tools）并导出每个 layer 为 PNG（保留透明通道）。

两种缩放路径（任选其一）：

Model-as-parameter：向 Gemini（gemini-2.5-pro）请求缩放参数/变换，然后用 Pillow/numPy 应用到 PNG / 更新 PSD，并返回结果。

Model-as-editor：把 layer PNG 发给 Gemini 的图像编辑端点（Flash Image / Nano-Banana）并用自然语言指令让模型返回缩放后的图层图片，再合并回 PSD。

把合并后的 PSD（或合成的 flattened PNG）返回给前端用于预览/下载。

前端展示结果并允许下载。

技术栈：

后端：Python 3.10+, fastapi, uvicorn, psd-tools, Pillow, google-genai（或 google.genai）客户端。Docs/示例见官方 SDK。
GitHub
+1

前端：React（Create-React-App / Vite 都行），fetch 上传文件、显示预览。

重要事实（依据官方/权威来源）：

Gemini API 支持图像生成与编辑（multi-modal），并有专门的 image-edit 功能（“Flash Image / Nano-Banana”）。
geminibyexample.com
+1

Google 提供 google-genai / python-genai SDK，示例里常用 genai.Client() 来调用图像编辑与文本/函数式能力。
GitHub
+1

模型家族包括 gemini-2.5-pro（以推理/复杂思考著称）与 gemini-2.5-flash-image（更偏图像生成/编辑）。你可以混合使用：pro 做逻辑/参数、flash-image 做像素级编辑。
Google AI for Developers
+1

详细步骤与代码思路（可直接拿去做）
1) 后端依赖安装
pip install fastapi uvicorn psd-tools pillow google-genai python-multipart


（google-genai 包名视官方仓库而定；示例文档中有 from google import genai 的用法。）
GitHub

2) 解析 PSD 并导出图层（后端核心函数）

思路：用 psd_tools 打开 PSD，遍历可见图层，导出为 RGBA PNG bytes，然后返回 layer 列表给前端供预览。

示例（后端 helper）：

# psd_helpers.py
from psd_tools import PSDImage
from PIL import Image
from io import BytesIO

def extract_layers_from_psd(psd_path):
    psd = PSDImage.open(psd_path)
    layers = []
    for idx, layer in enumerate(psd.descendants()):
        if not layer.is_group() and layer.visible:
            pil = layer.composite()  # returns PIL.Image (RGBA)
            buf = BytesIO()
            pil.save(buf, format='PNG')
            buf.seek(0)
            layers.append({
                "index": idx,
                "name": layer.name or f"layer_{idx}",
                "image_bytes": buf.read()
            })
    return layers


（psd-tools 的 composite() 会把单层渲染成 RGBA。有些复杂图层样式可能需要更细致处理，但这是常用流程。）

3A) 方案一 — Gemini 计算缩放参数 + 本地实际缩放（推荐）

优点：稳定、可重复、可控、费用低（不对每个像素付模次数），更容易做版本控制/回滚。

流程：

把 PSD 的图层元数据（图层原始宽高、分辨率、用户输入的语义要求，例如“把logo放大到比原来大 40% 并水平居中在画布右上角”）发送给 gemini-2.5-pro，用 function calling 或者明确 prompt 请求返回 JSON：{"scale":1.4, "anchor":"top-right", "dx": 10, "dy": -5}。官方文档有 function calling 指南。
Google AI for Developers

后端用 Pillow 对 layer PNG 做像素级缩放/平移并写回 PSD（或替换 layer 图像）。

返回合并后的合成 PNG 给前端显示。

示例：调用 Gemini（function-call）获取参数（伪代码）：

# gemini_parameter_call.py (伪代码)
from google import genai
from google.genai import types
import os
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def ask_scale_parameters(layer_meta, user_instruction):
    prompt = f"""Layer name: {layer_meta['name']}, w:{layer_meta['width']}, h:{layer_meta['height']}.
User instruction: {user_instruction}
Return ONLY a JSON object with fields: scale (float), anchor (one of top-left, top-right, center,...), dx, dy.
"""
    response = client.models.generate_content(
        model="gemini-2.5-pro",
        contents=[prompt],
        config=types.GenerateContentConfig(response_modalities=["Text"])
    )
    text = response.candidates[0].content.parts[0].text
    # parse text as JSON (with robust fallback)
    import json
    params = json.loads(text)
    return params


把参数应用到 layer（Pillow）：

from PIL import Image
from io import BytesIO

def apply_scale_to_layer(png_bytes, scale, dx=0, dy=0):
    im = Image.open(BytesIO(png_bytes)).convert("RGBA")
    new_size = (int(im.width * scale), int(im.height * scale))
    im_resized = im.resize(new_size, resample=Image.LANCZOS)
    # 若要合并到原画布（保留原 PSD 宽高），需要在透明画布上放置
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (0,0,0,0))
    # anchor logic -> compute x,y from anchor and dx/dy
    canvas.paste(im_resized, (x,y), im_resized)
    out = BytesIO()
    canvas.save(out, format="PNG")
    out.seek(0)
    return out.read()


注意：如果要回写为 PSD 层而不是输出合成图，你需要用 psd-tools 或者 psd-tools2 支持的写回 API（写入 PSD 更复杂，可能需用 psd-tools 的 group/Layer API 或第三方库）。在很多产品中直接返回合成 PNG 给前端是最简单且用户友好的方式。

3B) 方案二 — 让 Gemini 直接做图像编辑（模型生成缩放后的图层图片）

优点：可以让模型智能处理局部内容（例如放大并自动补全透明边缘、重绘像素）；缺点：可能不完全可控，花费较高。

思路依据官方示例：把 prompt 与 image bytes 一起发给模型（generate_content / image-edit endpoint），模型返回 image part。示例来自官方 image-edit doc。
geminibyexample.com
+1

示例（伪代码）：

from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def request_model_edit_scale(layer_png_bytes, instruction_text, model="gemini-2.5-flash-image"):
    img = Image.open(BytesIO(layer_png_bytes))
    response = client.models.generate_content(
        model=model,
        contents=[instruction_text, img],
        config=types.GenerateContentConfig(response_modalities=["Image","Text"])
    )
    # 在 response.candidates[0].content.parts 找到 inline_data（image bytes）
    for part in response.candidates[0].content.parts:
        if part.inline_data is not None:
            edited = Image.open(BytesIO(part.inline_data.data))
            out = BytesIO()
            edited.save(out, format="PNG")
            out.seek(0)
            return out.read()
    return None


instruction_text 例如 "Scale this layer to 150% keeping transparency and keeping the centre anchored; return a PNG only."

注意：模型在编辑时可能遵循或忽略一些约束（例如 exact pixel alignment）。要在产品环境用它来做关键编辑前，需要大量测试。官方文档也列出了支持的长宽比、编辑提示和合成注意事项。
Google Cloud Documentation

4) 合并图层并返回给前端

你可以：

把所有 layer 的 PIL 图像合成到 PSD canvas 上并输出为 PNG（Image.alpha_composite 或 paste with mask）。

或尝试把修改后的 PNG 写回 PSD（写入 layer），但这通常更复杂且依赖底层 PSD 写入支持。

示例（合成为 PNG）：

def merge_layers_to_flat(layers_images_bytes, canvas_size):
    from PIL import Image
    canvas = Image.new("RGBA", canvas_size, (0,0,0,0))
    for layer_bytes in layers_images_bytes:
        im = Image.open(BytesIO(layer_bytes)).convert("RGBA")
        canvas.alpha_composite(im)  # 需要图层有合适的偏移
    out = BytesIO()
    canvas.save(out, format="PNG")
    out.seek(0)
    return out.read()

5) 前端（React）关键交互

页面：上传 PSD -> 调用后端 /upload，后端保存 PSD 并返回 layer 列表（每个 layer 返回一个临时 URL 或 base64 缩略图）。

用户选择 layer、输入缩放（或拖动 slider），点击 “Apply” -> 调用 /scale_layer（带 layer id、scale、选项：use_model_editor: true/false）。

后端返回处理后的 flattened PNG URL -> 前端显示。

简化的 React 组件思路（伪代码）：

// LayerEditor.jsx (简化)
import React, {useState} from "react";

export default function LayerEditor() {
  const [psdFile, setPsdFile] = useState(null);
  const [layers, setLayers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [scale, setScale] = useState(1.0);
  const [resultUrl, setResultUrl] = useState(null);

  async function uploadPsd(e) {
    const f = e.target.files[0];
    const fd = new FormData();
    fd.append("file", f);
    const r = await fetch("/api/upload", {method:"POST", body:fd});
    const json = await r.json();
    setLayers(json.layers); // layers with preview URLs
  }

  async function applyScale() {
    const r = await fetch("/api/scale_layer", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({layer_index:selected, scale, use_model_editor: false})
    });
    const blob = await r.blob();
    setResultUrl(URL.createObjectURL(blob));
  }

  return (
    <div>
      <input type="file" accept=".psd" onChange={uploadPsd}/>
      <div>{layers.map(l => <img src={l.preview} width={80} onClick={()=>setSelected(l.index)}/>)}</div>
      <input type="range" min="0.1" max="3" step="0.05" value={scale} onChange={e=>setScale(e.target.value)}/>
      <button onClick={applyScale}>Apply</button>
      {resultUrl && <img src={resultUrl} alt="result" />}
    </div>
  );
}

6) 安全、性能与费用注意事项

模型编辑每张图片会产生成本（Flash Image/Imagen 的计费可能按输出 tokens/每图计价），在批量处理前要评估费用。
Google Developers Blog

如果 PSD 有大量图层或高分辨率图片，先在后端做缩略图预览，再让用户选择要处理的“关键层”。

当让模型直接编辑像素时，建议先在测试/沙盒环境做 QA，避免不可逆修改。

必须妥善保管 GEMINI_API_KEY、限制请求频率、对上传文件做病毒/敏感内容检测。

7) 端到端示例项目结构（建议）
project/
├─ backend/
│  ├─ app.py              # FastAPI routes: /upload, /list_layers, /scale_layer
│  ├─ psd_helpers.py
│  ├─ gemini_clients.py   # wrapper for parameter-call and image-edit calls
│  └─ requirements.txt
├─ frontend/
│  ├─ src/
│  │  ├─ LayerEditor.jsx
│  │  └─ ...
│  └─ package.json

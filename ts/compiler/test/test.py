from gradio import Blocks, Markdown
block = Blocks()
demo = None
with block as demo:
    Markdown("Hello, world!")
demo.launch()

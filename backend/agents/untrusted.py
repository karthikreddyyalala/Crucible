import re


def wrap_untrusted(tag: str, text: str) -> str:
    """Fence user-supplied text so an agent prompt can't confuse it for instructions.

    Every agent prompt states that content inside these tags is data, never
    directives. That guarantee only holds if the payload cannot close the fence
    early and continue as trusted prompt text, so any spelling of the tag is
    stripped from the body first.
    """
    fence = re.compile(rf"</?\s*{re.escape(tag)}\s*>", re.IGNORECASE)
    return f"<{tag}>\n{fence.sub('', text)}\n</{tag}>"

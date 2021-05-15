from django import template

register = template.Library()


@register.simple_tag(takes_context=True)
def show_insert(context, inserted: str, *args: str, reverse: bool = False) -> str:
    """
    Simple tag that inserts "inserted" if this id is in session["shown_ids"] list, or if reverse=True it does reverse.
    ID should be "str-str-...-str"
    """
    id_ = "-".join(args)
    session = context["request"].session
    if "shown_ids" in session:
        if reverse:
            if id_ in session["shown_ids"]:
                return ""
            return inserted
        else:
            if id_ in session["shown_ids"]:
                return inserted
            return ""
    return ""
    # FIXME should rewrite to simplify syntax in templates. Now it's heccin' ugly

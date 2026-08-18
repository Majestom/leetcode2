def build_linked_list(vals, cycle_at=None):
    if not vals: return None
    ns = [Node(v) for v in vals]
    for i in range(len(ns) - 1): ns[i].next = ns[i + 1]
    if cycle_at is not None: ns[-1].next = ns[cycle_at]
    return ns[0]

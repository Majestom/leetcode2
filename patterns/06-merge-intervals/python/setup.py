def norm(iv): return sorted([list(x) for x in iv])
def cmp_intervals(got, expected): return norm(got) == norm(expected)

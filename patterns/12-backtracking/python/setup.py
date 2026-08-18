def norm(xs): return sorted([tuple(sorted(x)) for x in xs])
def cmp_powerset(got, expected): return norm(got) == norm(expected)

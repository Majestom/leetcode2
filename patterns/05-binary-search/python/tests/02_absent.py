check("target absent", lambda: tuple(search_range([5, 7, 7, 8, 8, 10], 6)), (-1, -1))

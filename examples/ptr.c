int v[10];

main()
{
	int *p, *q;
	char *s, *t;

	p = &v[1];
	q = &v[7];
	s = "abcdef";
	t = s + 4;
	printf("%d %d\n", q - p, t - s);
	p = p + 3;
	printf("%d\n", p - v);
}

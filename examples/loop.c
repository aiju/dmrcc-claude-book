int v[100];

clear()
{
	register int *p, n;

	p = v;
	n = 100;
	do
		*p++ = 0;
	while (--n);
}

sum()
{
	register int *p, s;

	s = 0;
	for (p = v; p < &v[100]; p++)
		if (*p != 0)
			s =+ *p;
		else
			s =- 1;
	return(s);
}

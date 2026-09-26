int a, b, c, d;
int *p, *q;
char *cp;
long l, m;

f()
{
	a = b + c*d;
	*p++ = *q++;
	a = b << 2;
	a = b / 8;
	a = b % 10;
	*cp = a;
	l = l + m;
	a = cp[b];
	g(a, b+1);
}

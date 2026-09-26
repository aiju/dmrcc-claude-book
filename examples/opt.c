struct { int a, b, c, d; } *p;
int x, y, z;

f()
{
	p->d = 6;
	x = y + z;
	if (x)
		y = 1;
	if (z) {
		x = 1;
		y = 2;
	} else {
		x = 3;
		y = 2;
	}
	while (x)
		if (y)
			goto out;
		else
			x--;
out:
	z = 0;
}

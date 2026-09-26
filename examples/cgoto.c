main()
{
	int *where, n;

	n = 0;
	where = two;
	goto where;
one:
	printf("one\n");
	n++;
two:
	printf("two\n");
	if (n == 0) {
		where = one;
		goto where;
	}
}

/* Count the vowels in a string. */

char *s "hello, world";

main()
{
	register char *p;
	int n;

	n = 0;
	for (p = s; *p; p++)
		switch (*p) {
		case 'a': case 'e': case 'i':
		case 'o': case 'u':
			n++;
		}
	printf("%d\n", n);
}

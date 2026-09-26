int m[3][4];
int (*p[3])[4];
int (*q)[4];
char *argv[5];

main()
{
	printf("%d %d %d %d\n", sizeof m, sizeof p, sizeof q, sizeof argv);
	printf("%d %d\n", sizeof m[0], sizeof *q);
}

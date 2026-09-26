#define N 10
#define max(a,b) ((a)>(b)?(a):(b))
#ifdef unix
int onunix 1;
#endif

main()
{
	printf("%d\n", max(N, 7));
}

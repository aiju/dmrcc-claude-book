int a[] {1, 2, 3};
char s[10] "hi";
char *msg "hello";
int *p &a[1];
struct { int x; char c; int y; } st {1, 'a', -1};
struct node *head;
struct node { int val; struct node *next; } n1 {5, &n1};

main()
{
	static int calls;

	printf("%d %d %d\n", sizeof a, sizeof s, *p);
	printf("%s %d %d\n", msg, st.c, head == 0);
	calls++;
}

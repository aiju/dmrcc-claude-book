struct node {
	int	value;
	char	flag;
	int	kind:3;
	int	mark:1;
	int	count;
	struct	node *next;
	char	name[5];
};

struct node tab[10];
int (*fp)();
char *argv[4];
int matrix[3][4];

main()
{
	struct node *np;

	np = &tab[2];
	printf("%d %d %d\n", sizeof tab[0], sizeof matrix, sizeof np->name);
	printf("%d %d\n", &np->count - &np->value, &np->next - &np->value);
	printf("%d\n", np->kind);
}

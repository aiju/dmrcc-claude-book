#
/*
 * Tracing for c1, added for the commentary (not part of V6).
 * Trees are printed in prefix form between \002 and \003 so they
 * can be picked out of the assembly output afterwards.
 */
#include "c1h.c"

dbopt(at)
struct tnode *at;
{
	register struct tnode *t;

	printf("\002R %d ", line);
	ptree(at);
	printf("\003");
	t = optim(at);
	printf("\002O ");
	ptree(t);
	printf("\003");
	return(t);
}

struct tnode *dbtree;

dbmatch(tree, opt)
struct tnode *tree;
struct optab *opt;
{
	dbtree = tree;
	dbtab(opt, regtab, "regtab");
	dbtab(opt, efftab, "efftab");
	dbtab(opt, cctab, "cctab");
	dbtab(opt, sptab, "sptab");
}

dbtab(opt, tab, nam)
struct optab *opt;
struct table *tab;
char *nam;
{
	register struct table *tp;
	register struct optab *op;
	register n;

	for (tp = tab; tp->tabop; tp++) {
		n = 0;
		for (op = tp->tabp; op->tabdeg1; op++) {
			if (op == opt) {
				printf("\002M %s %d %d ", nam, tp->tabop, n);
				ptree(dbtree);
				printf("\003");
				return;
			}
			n++;
		}
	}
}

ptree(at)
struct tnode *at;
{
	register struct tnode *t;
	register struct tname *n;
	register op;

	if ((t = at)==0) {
		printf("0");
		return;
	}
	op = t->op;
	n = t;
	switch (op) {

	case 0:		/* empty argument list: only three words */
		printf("()");
		return;

	case NAME:
		switch (n->class) {
		case EXTERN:
			printf("_%.8s", &n->nloc);
			break;
		case STATIC:
			printf("L%d", n->nloc);
			break;
		case REG:
			printf("r%d", n->nloc);
			break;
		case AUTO:
			printf("%d(r5)", n->nloc);
			break;
		case OFFS:
			printf("%d(r%d)", n->offset, n->regno);
			break;
		case XOFFS:
			printf("_%.8s+%d(r%d)", &n->nloc, n->offset, n->regno);
			break;
		case SOFFS:
			printf("L%d+%d(r%d)", n->nloc, n->offset, n->regno);
			break;
		default:
			printf("?%d", n->class);
		}
		if ((n->class==EXTERN || n->class==STATIC) && n->offset)
			printf("+%d", n->offset);
		printf(":%d", n->ntype);
		return;

	case CON:
	case SFCON:
		printf("$%d:%d", t->value, t->type);
		return;

	case FCON:
		printf("L%d:%d", t->value, t->type);
		return;

	case AUTOI:
		printf("(r%d)+:%d", n->nloc, t->type);
		return;

	case AUTOD:
		printf("-(r%d):%d", n->nloc, t->type);
		return;

	case CBRANCH:
		printf("(%d:L%d:%d ", op, t->lbl, t->cond);
		ptree(t->btree);
		printf(")");
		return;
	}
	printf("(%d:%d:%d ", op, t->type, t->degree);
	ptree(t->tr1);
	if (opdope[op]&BINARY) {
		printf(" ");
		ptree(t->tr2);
	}
	printf(")");
}

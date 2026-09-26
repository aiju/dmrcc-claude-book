char s[10] "hi";
char *msg "hello";
int after 1234;

main()
{
	printf("s at %o, msg at %o, after at %o\n", s, &msg, &after);
	s[4] = 'X';
	printf("%s %d\n", msg, after);
}

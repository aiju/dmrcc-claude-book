.globl	_main
.text
_main:
~~main:
~n=177766
~where=177770
jsr	r5,csv
sub	$4,sp
clr	-12(r5)
mov	$L2,-10(r5)
jmp	*-10(r5)
.globl
.data
L4:.byte 157,156,145,12,0
L5:.byte 164,167,157,12,0

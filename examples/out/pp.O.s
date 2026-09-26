.globl	_onunix
.data
_onunix:
1
.globl	_main
.text
_main:
~~main:
jsr	r5,csv
cmp	$7,$12
jge	L10000
mov	$12,(sp)
jbr	L10001
L10000:mov	$7,(sp)
L10001:mov	$L2,-(sp)
jsr	pc,*$_printf
tst	(sp)+
jmp	cret
.globl
.data
L2:.byte 45,144,12,0

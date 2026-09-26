.globl	_s
.data
_s:
L1
.globl	_main
.text
_main:
~~main:
~n=177770
~p=r4
jsr	r5,csv
tst	-(sp)
clr	-10(r5)
mov	_s,r4
L3:tstb	(r4)
jeq	L4
movb	(r4),r0
jbr	L7
L8:L9:L10:L11:L12:inc	-10(r5)
jbr	L6
L7:mov	$L10001,r1
mov	r0,L10002
L10003:cmp	r0,(r1)+
jne	L10003
jmp	*L10002-L10001(r1)
.data
L10001:141
145
151
157
165
L10002:..
L8
L9
L10
L11
L12
L6
.text
L6:L5:inc	r4
jbr	L3
L4:mov	-10(r5),(sp)
mov	$L13,-(sp)
jsr	pc,*$_printf
tst	(sp)+
L2:jmp	cret
.globl
.data
L1:.byte 150,145,154,154,157,54,40,167,157,162,154,144,0
L13:.byte 45,144,12,0

.globl	_dense
.text
_dense:
~~dense:
~n=4
jsr	r5,csv
mov	4(r5),r0
jbr	L3
L4:mov	$12,r0
jbr	L1
L5:mov	$24,r0
jbr	L1
L6:mov	$50,r0
jbr	L1
jbr	L2
L3:sub	$1,r0
cmp	r0,$3
jhi	L2
asl	r0
jmp	*L10001(r0)
.data
L10001:L4
L5
L2
L6
.text
L2:clr	r0
jbr	L1
L1:jmp	cret
.globl	_few
.text
_few:
~~few:
~n=4
jsr	r5,csv
mov	4(r5),r0
jbr	L9
L10:mov	$1,r0
jbr	L7
L11:mov	$2,r0
jbr	L7
L12:mov	$3,r0
jbr	L7
jbr	L8
L9:mov	$L10003,r1
mov	r0,L10004
L10005:cmp	r0,(r1)+
jne	L10005
jmp	*L10004-L10003(r1)
.data
L10003:1
144
1750
L10004:..
L10
L11
L12
L8
.text
L8:clr	r0
jbr	L7
L7:jmp	cret
.globl	_many
.text
_many:
~~many:
~n=4
jsr	r5,csv
mov	4(r5),r0
jbr	L15
L16:mov	$1,r0
jbr	L13
L17:mov	$2,r0
jbr	L13
L18:mov	$3,r0
jbr	L13
L19:mov	$4,r0
jbr	L13
L20:mov	$5,r0
jbr	L13
L21:mov	$6,r0
jbr	L13
L22:mov	$7,r0
jbr	L13
L23:mov	$10,r0
jbr	L13
L24:mov	$11,r0
jbr	L13
L25:mov	$12,r0
jbr	L13
jbr	L14
L15:mov	r0,r1
clr	r0
div	$2,r0
asl	r1
add	$L10008,r1
mov	r0,*(r1)+
mov	(r1)+,r1
L10007:cmp	r0,-(r1)
jne	L10007
jmp	*L10011-L10009(r1)
.data
L10008:L10009
L10010
L10011
L10009:..
67
175
400
1000
1750
2734
L10010:..
1
10
310
604
L10011:L14
L18
L19
L21
L23
L24
L25
L14
L16
L17
L20
L22
.text
L14:clr	r0
jbr	L13
L13:jmp	cret
.globl
.data

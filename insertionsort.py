
arraydata = [10,5,3,2,9,8]
def insertionsort(arraydata):
    for i in range (1,len(arraydata)):
        temp = 0
        j = i
        while j > 0:
            if arraydata[j] < arraydata[j-1]:
                temp = arraydata[j-1]
                arraydata[j-1] = arraydata[j]
                arraydata[j] = temp
                j = j-1
       
    return print(arraydata)

insertionsort(arraydata)


    

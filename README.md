简单实现的日志收集工具

logstash太尴尬了，不知道是不是我姿势不正确，特么作为日志agent消耗的资源比我一个服务进程都大，只能自己简单撸一个了。。。

emmm，目前实现了从文件收集写入mongodb

缺少测试，缺少异常处理等等，先占个坑。。


其实我更想用go写，可惜还没学好
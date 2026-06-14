from django.db import migrations


def seed_goods_data(apps, schema_editor):
    ExchangeGoods = apps.get_model('points', 'ExchangeGoods')

    goods_list = [
        {
            'goods_code': 'PHY001',
            'name': '环保帆布袋',
            'description': '优质帆布材质，大容量设计，时尚环保，可重复使用，是您日常购物的好帮手。',
            'type': 'physical',
            'points_price': 500,
            'market_price': 29.9,
            'stock': 100,
            'sold': 0,
            'status': 1,
            'category': '生活周边',
            'sort': 1,
        },
        {
            'goods_code': 'PHY002',
            'name': '竹纤维毛巾套装',
            'description': '天然竹纤维材质，柔软亲肤，抗菌除臭，吸水性强，两条装。',
            'type': 'physical',
            'points_price': 800,
            'market_price': 49.9,
            'stock': 80,
            'sold': 0,
            'status': 1,
            'category': '生活周边',
            'sort': 2,
        },
        {
            'goods_code': 'PHY003',
            'name': '多肉植物盆栽',
            'description': '精选可爱多肉植物，搭配精美陶瓷花盆，为您的生活增添一抹绿意。',
            'type': 'physical',
            'points_price': 1200,
            'market_price': 68.0,
            'stock': 50,
            'sold': 0,
            'status': 1,
            'category': '绿植花卉',
            'sort': 3,
        },
        {
            'goods_code': 'PHY004',
            'name': '可降解餐具套装',
            'description': '小麦秸秆材质，可自然降解，环保健康，包含碗、盘、勺、筷四件套。',
            'type': 'physical',
            'points_price': 600,
            'market_price': 35.0,
            'stock': 120,
            'sold': 0,
            'status': 1,
            'category': '生活周边',
            'sort': 4,
        },
        {
            'goods_code': 'VIR001',
            'name': '超市购物优惠券',
            'description': '10元超市购物优惠券，全场通用，满50元可用，有效期30天。',
            'type': 'virtual',
            'points_price': 300,
            'market_price': 10.0,
            'stock': 500,
            'sold': 0,
            'status': 1,
            'category': '优惠券',
            'sort': 5,
        },
        {
            'goods_code': 'VIR002',
            'name': '绿色出行代金券',
            'description': '5元公交地铁代金券，支持扫码乘车，绿色出行从我做起。',
            'type': 'virtual',
            'points_price': 200,
            'market_price': 5.0,
            'stock': 1000,
            'sold': 0,
            'status': 1,
            'category': '优惠券',
            'sort': 6,
        },
        {
            'goods_code': 'VIR003',
            'name': '咖啡买一送一券',
            'description': '指定连锁咖啡店买一送一券，畅享美味咖啡时光。',
            'type': 'virtual',
            'points_price': 400,
            'market_price': 25.0,
            'stock': 200,
            'sold': 0,
            'status': 1,
            'category': '优惠券',
            'sort': 7,
        },
        {
            'goods_code': 'VIR004',
            'name': '环保知识付费课程',
            'description': '资深环保专家主讲，带你深入了解垃圾分类和低碳生活方式。',
            'type': 'virtual',
            'points_price': 1500,
            'market_price': 99.0,
            'stock': 999,
            'sold': 0,
            'status': 1,
            'category': '学习课程',
            'sort': 8,
        },
    ]

    for goods_data in goods_list:
        ExchangeGoods.objects.get_or_create(
            goods_code=goods_data['goods_code'],
            defaults=goods_data
        )


def reverse_func(apps, schema_editor):
    ExchangeGoods = apps.get_model('points', 'ExchangeGoods')
    ExchangeGoods.objects.filter(
        goods_code__in=['PHY001', 'PHY002', 'PHY003', 'PHY004', 'VIR001', 'VIR002', 'VIR003', 'VIR004']
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('points', '0003_exchangegoods_type_exchangeorder_goods_type_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_goods_data, reverse_func),
    ]

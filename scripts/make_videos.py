import os
import subprocess

OUT_DIR = "public/videos"
os.makedirs(OUT_DIR, exist_ok=True)

FONT_SERIF = "/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"

def generate_video(
    output_filename: str,
    duration: int,
    bg_color: str,
    title: str,
    quote: str,
    intertitle: str,
    weather_badge: str,
    audio_type: str = "rain"
):
    output_path = os.path.join(OUT_DIR, output_filename)
    print(f"Generating {output_path}...")

    # Audio synthesis filter
    if audio_type == "rain":
        audio_src = f"anoisesrc=d={duration}:c=pink:r=44100:a=0.1"
    elif audio_type == "sun":
        audio_src = f"aevalsrc=sin(2*PI*523.25*t)*0.1+sin(2*PI*659.25*t)*0.08:d={duration}:s=44100"
    elif audio_type == "storm":
        audio_src = f"anoisesrc=d={duration}:c=brown:r=44100:a=0.2"
    elif audio_type == "snow":
        audio_src = f"anoisesrc=d={duration}:c=pink:r=44100:a=0.08"
    else:
        audio_src = f"aevalsrc=sin(2*PI*440*t)*0.1:d={duration}:s=44100"

    vf = (
        f"drawbox=x=0:y=0:w=1280:h=720:color={bg_color}:t=fill,"
        "drawbox=x=30:y=30:w=1220:h=660:color=0xd4af37@0.8:t=4,"
        "drawbox=x=40:y=40:w=1200:h=640:color=0xd4af37@0.3:t=1,"
        "drawbox=x=24:y=24:w=16:h=16:color=0xfce881:t=fill,"
        "drawbox=x=1240:y=24:w=16:h=16:color=0xfce881:t=fill,"
        "drawbox=x=24:y=680:w=16:h=16:color=0xfce881:t=fill,"
        "drawbox=x=1240:y=680:w=16:h=16:color=0xfce881:t=fill,"
        f"drawtext=fontfile='{FONT_BOLD}':text='ГОСКИНО  ★  СИНЕМА 1927 ГОДА  ★  «12 СТУЛЬЕВЪ»':fontcolor=0xd4af37:fontsize=22:x=(w-text_w)/2:y=65,"
        f"drawtext=fontfile='{FONT_SERIF}':text='{weather_badge}':fontcolor=0xe8dac7:fontsize=20:x=(w-text_w)/2:y=105,"
        "drawbox=x=200:y=140:w=880:h=2:color=0xd4af37@0.6:t=fill,"
        "drawbox=x=160:y=170:w=960:h=380:color=0x0a070e@0.9:t=fill,"
        "drawbox=x=170:y=180:w=940:h=360:color=0xd4af37@0.4:t=2,"
        f"drawtext=fontfile='{FONT_BOLD}':text='{title}':fontcolor=0xfce881:fontsize=72:x=(w-text_w)/2:y=230,"
        f"drawtext=fontfile='{FONT_SERIF}':text='{quote}':fontcolor=0xffffff:fontsize=26:x=(w-text_w)/2:y=340,"
        f"drawtext=fontfile='{FONT_SERIF}':text='{intertitle}':fontcolor=0xd4af37:fontsize=22:x=(w-text_w)/2:y=420,"
        "drawbox=x=200:y=580:w=880:h=2:color=0xd4af37@0.6:t=fill,"
        f"drawtext=fontfile='{FONT_SERIF}':text='Эллочка Щукина • В главной роли • Словарь 30 слов':fontcolor=0xbaa896:fontsize=18:x=(w-text_w)/2:y=610,"
        "noise=alls=12:allf=t+u,"
        "curves=preset=vintage"
    )

    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", f"color=c={bg_color}:s=1280x720:d={duration}:r=24",
        "-f", "lavfi", "-i", audio_src,
        "-filter_complex", f"[0:v]{vf}[v]",
        "-map", "[v]",
        "-map", "1:a",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "ultrafast",
        "-c:a", "aac", "-b:a", "96k",
        output_path
    ]

    subprocess.run(cmd, check=True)
    print(f"Generated {output_path} ({os.path.getsize(output_path)} bytes)")

# 1. Rain Video: "МРАК"
generate_video(
    output_filename="ellochka_rain_mrak.mp4",
    duration=10,
    bg_color="0x111622",
    title="« М Р А К ! »",
    quote="«Шанхайский барс промокнет до нитки! Небо серое, как чулки фининспектора...»",
    intertitle="Эллочка раскрывает шелковый зонтик под дождем на старинной брусчатке",
    weather_badge="🌧️ ДОЖДЬ И СЛЯКОТЬ • СЦЕНА С ШЕЛКОВЫМ ЗОНТИКОМ",
    audio_type="rain"
)

# 2. Sun Video: "КРАСОТА"
generate_video(
    output_filename="ellochka_sun_krasota.mp4",
    duration=10,
    bg_color="0x261e0e",
    title="« К Р А С О Т А ! »",
    quote="«Солнце светит прямо в граненое зеркало. Убейся, Вандербильдиха!»",
    intertitle="Зонтик закрыт! Эллочка любуется чайным ситечком в золотых лучах солнца",
    weather_badge="☀️ СОЛНЦЕ И ТЕПЛО • ТРИУМФ ЧАЙНОГО СИТЕЧКА",
    audio_type="sun"
)

# 3. Storm Video: "ЖУТЬ"
generate_video(
    output_filename="ellochka_storm_zhut.mp4",
    duration=8,
    bg_color="0x1a0f24",
    title="« Ж У Т Ь ! »",
    quote="«Гром гремит пуще, чем муж Эрнест на коммунальной кухне!»",
    intertitle="Сгущаются свинцовые тучи, вспыхивают молнии над старой Москвой",
    weather_badge="⚡ ГРОЗА И МОЛНИИ • ЗЛОВЕЩИЙ ШКВАЛ",
    audio_type="storm"
)

# 4. Snow Video: "У ВАС ВСЯ СПИНА БЕЛАЯ"
generate_video(
    output_filename="ellochka_snow_metel.mp4",
    duration=8,
    bg_color="0x121b28",
    title="« У ВАС ВСЯ СПИНА БЕЛАЯ ! »",
    quote="«Хи-хи! Снегу навалило по пояс! Спасает мексиканский тушкан!»",
    intertitle="Эллочка кутается в пушистые меха, стряхивая снежинки с плеча",
    weather_badge="❄️ СНЕГ И МОРОЗ • МЕКСИКАНСКИЙ ТУШКАН",
    audio_type="snow"
)

# 5. Taxi Video: "ПОЕДЕМ НА ТАКСО"
generate_video(
    output_filename="ellochka_taxi.mp4",
    duration=8,
    bg_color="0x18131e",
    title="« ПОЕДЕМ НА ТАКСО ! »",
    quote="«В таких шелковых туфельках по лужам не ходят даже буржуазки!»",
    intertitle="Эллочка ловит старинное таксо на шумном перекрестке",
    weather_badge="🚖 ЛИВЕНЬ И ЛУЖИ • ТАКСОМОТОР С КЛАКСОНОМ",
    audio_type="taxi"
)

# 6. Chic Video: "ШИК И БЛЕСК"
generate_video(
    output_filename="ellochka_shik.mp4",
    duration=8,
    bg_color="0x261d12",
    title="« Ш И К   И   Б Л Е С К ! »",
    quote="«Воздух такой сладкий, прямо как пирожное из бывшей кондитерской Абрикосова!»",
    intertitle="Прогулка в диадеме и жемчугах по залитому солнцем бульвару",
    weather_badge="✨ ИДЕАЛЬНАЯ ПОГОДА • СВЕТСКИЙ ВЫХОД",
    audio_type="sun"
)

# 7. Vanderbilt Video: "УБЕЙСЯ, ВАНДЕРБИЛЬДИХА"
generate_video(
    output_filename="ellochka_vanderbilt.mp4",
    duration=8,
    bg_color="0x241710",
    title="« У Б Е Й С Я ,   В А Н Д Е Р Б И Л Ь Д И Х А ! »",
    quote="«В Палм-Бич у твоей миллионерши от зависти лопнет колье из натурального жемчуга!»",
    intertitle="Эллочка победно кружится в лучах полуденного солнца в новом манто",
    weather_badge="💎 ТРИУМФ НАД АМЕРИКОЙ • СОЛНЕЧНЫЙ ЗЕНИТ",
    audio_type="sun"
)

# 8. Tea Strainer Video: "ЧАЙНОЕ СИТЕЧКО"
generate_video(
    output_filename="ellochka_sitichko.mp4",
    duration=8,
    bg_color="0x2a220f",
    title="« Ч А Й Н О Е   С И Т Е Ч К О ! »",
    quote="«Оно сверкает ярче июльского солнца! Эрнестушка, это же чистый восторг!»",
    intertitle="Эллочка ловит солнечные зайчики ситечком перед трюмо",
    weather_badge="✨ СИЯНИЕ ЗОЛОТА • ТЕПЛО И БЛАГОДАТЬ",
    audio_type="sun"
)

# 9. Wind / Storm Video: "КОЛОССАЛЬНО"
generate_video(
    output_filename="ellochka_veter.mp4",
    duration=8,
    bg_color="0x151f28",
    title="« К О Л О С С А Л Ь Н О ! »",
    quote="«Шквал такой, что даже у шанхайского барса шерсть встала дыбом!»",
    intertitle="Ветер срывает шляпки и развевает страусовое боа на мосту",
    weather_badge="💨 БУРНЫЙ ВЕТЕР • ШКВАЛ И ВИХРИ",
    audio_type="storm"
)

# 10. Fog Video: "ПОДУМАЕШЬ"
generate_video(
    output_filename="ellochka_tuman.mp4",
    duration=8,
    bg_color="0x1a1e22",
    title="« П О Д У М А Е Ш Ь ! »",
    quote="«Туман как парижская вуаль. Не видно даже фонарей у гостиницы Метрополь!»",
    intertitle="Таинственная фигура Эллочки растворяется в утренней дымке",
    weather_badge="🌫️ СЕДОЙ ТУМАН • ПАРИЖСКИЙ ШИК",
    audio_type="snow"
)

# 11. Frost Video: "МЯКОТЬ"
generate_video(
    output_filename="ellochka_moroz.mp4",
    duration=8,
    bg_color="0x101a24",
    title="« М Я К О Т Ь ! »",
    quote="«Мороз звенит хрусталем! Самое время выгулять мексиканского тушкана!»",
    intertitle="Эллочка дышит морозным паром и хлопает пушистой муфтой",
    weather_badge="❄️ ЯСНЫЙ МОРОЗ • ХРУСТАЛЬНЫЙ ВОЗДУХ",
    audio_type="snow"
)

print("ALL EXTENDED VIDEOS GENERATED!")


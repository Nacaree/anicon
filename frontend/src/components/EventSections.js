import EventCard from "./EventCard";
import EventCarousel from "./EventCarousel";

export default function EventSections() {
  return (
    <div className="space-y-8">
      {/* Trending Events */}
      <section>
        <h2 className="text-xl font-bold text-gray-800">Trending Events</h2>
        <EventCarousel>
          <EventCard
            title="Anime Expo 2025"
            date="Jan 15-17, 2025"
            location="Tokyo Big Sight, Japan"
            imageUrl="https://images.unsplash.com/photo-1613376023733-0a73315d9b06?w=400&h=300&fit=crop"
          />
          <EventCard
            title="Cosplay Championship"
            date="Feb 10-11, 2025"
            location="Jakarta Convention Center"
            imageUrl="https://static.wixstatic.com/media/da9adc_6e7d859088b147e4939bc7a3785b7858~mv2.png/v1/fill/w_280,h_150,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/CosplayX_SMASH_COS_Page_Banner-01.png"
          />
          <EventCard
            title="Manga Festival"
            date="Mar 5-7, 2025"
            location="Osaka International Convention Center"
            imageUrl="https://www.otakuthon.com/2025/images/event-announcement.jpg?20230923"
          />
          <EventCard
            title="Tokyo Game Show"
            date="Apr 20-22, 2025"
            location="Makuhari Messe, Japan"
            imageUrl="https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=300&fit=crop"
          />
          <EventCard
            title="Anime North"
            date="May 15-17, 2025"
            location="Toronto Convention Center"
            imageUrl="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=300&fit=crop"
          />
          <EventCard
            title="Comic Market 103"
            date="Jun 8-9, 2025"
            location="Tokyo Big Sight, Japan"
            imageUrl="https://images.unsplash.com/photo-1601814933824-fd0b574dd592?w=400&h=300&fit=crop"
          />
        </EventCarousel>
      </section>

      {/* Cosplay Events */}
      <section>
        <h2 className="text-xl font-bold text-gray-800">Cosplay Events</h2>
        <EventCarousel>
          <EventCard
            title="Summer Cosplay Contest"
            date="Jun 20-22, 2025"
            location="Singapore Expo"
            imageUrl="https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&h=300&fit=crop"
          />
          <EventCard
            title="Japan Culture Fest"
            date="Jul 12-14, 2025"
            location="Tokyo Dome City"
            imageUrl="https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=400&h=300&fit=crop"
          />
          <EventCard
            title="Comic Con Asia"
            date="Aug 8-10, 2025"
            location="IMPACT Arena, Bangkok"
            imageUrl="https://bsmedia.business-standard.com/_media/bs/img/article/2025-07/16/full/20250716140636.jpg"
          />
          <EventCard
            title="Cosplay Mania"
            date="Sep 15-16, 2025"
            location="SMX Convention Center, Manila"
            imageUrl="https://images.unsplash.com/photo-1609743522653-52354461eb27?w=400&h=300&fit=crop"
          />
          <EventCard
            title="Halloween Cosplay Ball"
            date="Oct 31, 2025"
            location="Los Angeles Convention Center"
            imageUrl="https://images.unsplash.com/photo-1509248961158-e54f6934749c?w=400&h=300&fit=crop"
          />
          <EventCard
            title="Winter Wonderland Cosplay"
            date="Dec 20-21, 2025"
            location="Sapporo Snow Festival Grounds"
            imageUrl="https://images.unsplash.com/photo-1551069613-1904dbdcda11?w=400&h=300&fit=crop"
          />
        </EventCarousel>
      </section>
    </div>
  );
}

import { SiteBanner } from "./SiteBanner";
import { SiteBannerSlide } from "./SiteBannerSlide";
import { SiteContentPage } from "./SiteContentPage";
import { SiteContentSection } from "./SiteContentSection";
import { SiteContentSectionCardItem } from "./SiteContentSectionCardItem";
import { Notice } from "./Notice";
import { NoticeAttachment } from "./NoticeAttachment";
import { Gallery } from "./Gallery";
import { GalleryImage } from "./GalleryImage";
import { Qna } from "./Qna";
import { QnaAnswer } from "./QnaAnswer";
import { Faq } from "./Faq";
import { Apply } from "./Apply";
SiteBanner.associate();
SiteBannerSlide.associate();

SiteContentPage.associate();
SiteContentSection.associate();
SiteContentSectionCardItem.associate();

Notice.associate();
NoticeAttachment.associate();

Gallery.associate();
GalleryImage.associate();

Qna.associate();
QnaAnswer.associate();

Faq.associate();
Apply.associate();
export {
  SiteBanner,
  SiteBannerSlide,
  SiteContentPage,
  SiteContentSection,
  SiteContentSectionCardItem,
  Notice,
  NoticeAttachment,
  Gallery,
  GalleryImage,
  Qna,
  QnaAnswer,
  Faq,
  Apply
};
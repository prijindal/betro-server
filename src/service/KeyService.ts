import { Service } from "typedi";
import { Repository } from "typeorm";
import { InjectRepository } from "typeorm-typedi-extensions";
import { UserSymKey } from "../entities";

@Service()
export class KeyService {
  constructor(
    @InjectRepository(UserSymKey)
    private readonly userSymKeyRepository: Repository<UserSymKey>
  ) {}
  createSymKey = async (sym_key: string): Promise<string> => {
    const queryResult = await this.userSymKeyRepository.save(
      this.userSymKeyRepository.create({
        sym_key,
      })
    );
    return queryResult.id;
  };

  getSymKeys = async (
    key_ids: Array<string>
  ): Promise<{ [key_id: string]: string }> => {
    const queryResult =
      key_ids.length === 0
        ? []
        : await this.userSymKeyRepository
            .createQueryBuilder()
            .where("id IN (:...key_ids)", { key_ids })
            .getMany();
    const keyMap: { [key_id: string]: string } = {};
    queryResult.forEach((row) => {
      keyMap[row.id] = row.sym_key;
    });
    return keyMap;
  };

  deleteSymKey = async (key_id: string): Promise<boolean> => {
    const queryResult = await this.userSymKeyRepository.delete({ id: key_id });
    return queryResult.affected == 1;
  };
}
